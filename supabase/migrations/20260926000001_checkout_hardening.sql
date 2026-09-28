-- Checkout hardening: first-to-reserve-wins without self-blocking, retryable checkout,
-- availability pushed to every cart that holds an item, guest order access and scheduled release.
-- Concurrency model: the database is the single source of truth.
--  * Lock order is always: buyer cart -> product_items (id order) -> cart_signals (cart id order).
--  * Items are locked FOR NO KEY UPDATE, which serializes reservations but does not block the
--    FOR KEY SHARE lock an INSERT into shopping_cart_items takes on its referenced item.
--  * Other buyers are notified through cart_signals, never by updating their shopping_carts row,
--    which they may hold locked while waiting for the same item (that would deadlock).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cart_revision bigint;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS access_token text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_idx ON public.orders(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_user_pending_idx ON public.orders(user_id) WHERE status = 'pending';

-- Several preference attempts per order (retry after rejection or expiry); at most one in flight.
DROP INDEX IF EXISTS public.payment_attempts_one_per_order_idx;
CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_active_idx ON public.payment_attempts(order_id) WHERE status IN ('creating','ready');

-- Availability signal per cart. Realtime pushes its updates to the cart owner only (RLS).
CREATE TABLE IF NOT EXISTS public.cart_signals (
  cart_id uuid PRIMARY KEY REFERENCES public.shopping_carts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cart_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cart_signals_select_own ON public.cart_signals;
CREATE POLICY cart_signals_select_own ON public.cart_signals FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
GRANT SELECT ON public.cart_signals TO authenticated;
GRANT ALL ON public.cart_signals TO service_role;
INSERT INTO public.cart_signals(cart_id, owner_id) SELECT id, owner_id FROM public.shopping_carts ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public._create_cart_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.cart_signals(cart_id, owner_id) VALUES (NEW.id, NEW.owner_id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._create_cart_signal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS shopping_carts_signal ON public.shopping_carts;
CREATE TRIGGER shopping_carts_signal AFTER INSERT ON public.shopping_carts FOR EACH ROW EXECUTE FUNCTION public._create_cart_signal();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cart_signals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_signals;
  END IF;
END $$;

-- Signals every cart holding one of the items. Rows are locked in cart id order so concurrent signalers cannot deadlock.
CREATE OR REPLACE FUNCTION public._bump_carts_for_items(p_items uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH targets AS (
    SELECT s.cart_id FROM public.cart_signals s
    WHERE s.cart_id IN (SELECT ci.cart_id FROM public.shopping_cart_items ci WHERE ci.product_item_id = ANY(p_items))
    ORDER BY s.cart_id FOR UPDATE
  )
  UPDATE public.cart_signals s SET version = s.version + 1, updated_at = now() FROM targets t WHERE s.cart_id = t.cart_id;
$$;
REVOKE ALL ON FUNCTION public._bump_carts_for_items(uuid[]) FROM PUBLIC, anon, authenticated;

-- Releases the active reservations of an unpaid order and notifies affected carts.
CREATE OR REPLACE FUNCTION public._release_order(p_order uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_items uuid[];
BEGIN
  UPDATE public.orders SET status = p_status WHERE id = p_order AND payment_status IS DISTINCT FROM 'completed';
  WITH released AS (
    UPDATE public.item_reservations SET status = 'released'
    WHERE order_id = p_order AND status = 'active' RETURNING product_item_id
  ) SELECT array_agg(product_item_id) INTO v_items FROM released;
  IF v_items IS NOT NULL THEN PERFORM public._bump_carts_for_items(v_items); END IF;
END $$;
REVOKE ALL ON FUNCTION public._release_order(uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cart_change(p_item_id uuid, p_action text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_cart uuid; v_price numeric(10,2); v_revision bigint; v_count int;
BEGIN
  IF auth.uid() IS NULL OR p_action NOT IN ('add','remove','accept_price') THEN RAISE EXCEPTION 'Invalid cart operation'; END IF;
  INSERT INTO public.shopping_carts(owner_id) VALUES (auth.uid()) ON CONFLICT (owner_id) DO NOTHING;
  SELECT id INTO v_cart FROM public.shopping_carts WHERE owner_id = auth.uid() FOR UPDATE;
  IF p_action = 'add' THEN
    SELECT count(*) INTO v_count FROM public.shopping_cart_items WHERE cart_id = v_cart;
    IF v_count >= 20 THEN RAISE EXCEPTION 'Cart limit reached'; END IF;
    SELECT i.price INTO v_price FROM public.product_items i
      JOIN public.product_variants v ON v.id = i.variant_id
      JOIN public.products p ON p.id = v.product_id
      WHERE i.id = p_item_id AND p.is_active AND i.stock > 0 AND coalesce(i.status,'available') = 'available';
    IF v_price IS NULL THEN RAISE EXCEPTION 'Item unavailable'; END IF;
    INSERT INTO public.shopping_cart_items(cart_id, product_item_id, price_at_add)
      VALUES (v_cart, p_item_id, v_price) ON CONFLICT DO NOTHING;
  ELSIF p_action = 'accept_price' THEN
    UPDATE public.shopping_cart_items ci SET price_at_add = i.price
      FROM public.product_items i WHERE i.id = ci.product_item_id AND ci.cart_id = v_cart AND ci.product_item_id = p_item_id;
  ELSE
    DELETE FROM public.shopping_cart_items WHERE cart_id = v_cart AND product_item_id = p_item_id;
  END IF;
  UPDATE public.shopping_carts SET revision = revision + 1, updated_at = now() WHERE id = v_cart RETURNING revision INTO v_revision;
  RETURN v_revision;
END $$;

-- Guest cart and guest orders move to the signed-in account. Called only by the server.
CREATE OR REPLACE FUNCTION public.cart_merge_verified(p_guest uuid, p_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_guest_cart uuid; v_owner_cart uuid;
BEGIN
  IF p_guest IS NULL OR p_owner IS NULL OR p_guest = p_owner THEN RETURN; END IF;
  INSERT INTO public.shopping_carts(owner_id) VALUES (p_owner) ON CONFLICT (owner_id) DO NOTHING;
  -- Lock both carts in id order so two concurrent merges cannot deadlock.
  PERFORM 1 FROM public.shopping_carts WHERE owner_id IN (p_guest, p_owner) ORDER BY id FOR UPDATE;
  SELECT id INTO v_owner_cart FROM public.shopping_carts WHERE owner_id = p_owner;
  SELECT id INTO v_guest_cart FROM public.shopping_carts WHERE owner_id = p_guest;
  UPDATE public.orders SET user_id = p_owner WHERE user_id = p_guest;
  IF v_guest_cart IS NULL THEN RETURN; END IF;
  INSERT INTO public.shopping_cart_items(cart_id, product_item_id, price_at_add)
    SELECT v_owner_cart, product_item_id, price_at_add FROM public.shopping_cart_items WHERE cart_id = v_guest_cart
    ON CONFLICT DO NOTHING;
  DELETE FROM public.shopping_carts WHERE id = v_guest_cart;
  UPDATE public.shopping_carts SET revision = revision + 1, updated_at = now() WHERE id = v_owner_cart;
END $$;
REVOKE ALL ON FUNCTION public.cart_merge_verified(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cart_merge_verified(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_checkout(p_key uuid, p_contact jsonb, p_delivery uuid, p_address text, p_expected_total numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_cart uuid; v_revision bigint; v_item record; v_option public.delivery_options%ROWTYPE; v_order uuid;
  v_existing public.orders%ROWTYPE; v_prior record; v_subtotal numeric(10,2) := 0; v_items uuid[] := '{}'; v_held int;
BEGIN
  IF auth.uid() IS NULL OR p_key IS NULL OR p_contact->>'name' IS NULL OR p_contact->>'phone' IS NULL
    OR p_contact->>'email' IS NULL OR length(trim(p_contact->>'name')) < 2
    OR length(trim(p_contact->>'phone')) < 6 OR length(trim(p_contact->>'email')) < 5 THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  -- The cart lock serializes every checkout of this buyer (double click, two tabs, two devices).
  SELECT id, revision INTO v_cart, v_revision FROM public.shopping_carts WHERE owner_id = auth.uid() FOR UPDATE;
  IF v_cart IS NULL THEN RAISE EXCEPTION 'Empty cart'; END IF;

  SELECT * INTO v_existing FROM public.orders WHERE user_id = auth.uid() AND idempotency_key = p_key;
  IF FOUND THEN
    IF v_existing.payment_status IN ('completed','review','refunded')
      OR (v_existing.status = 'pending' AND v_existing.reservation_expires_at > now()) THEN RETURN v_existing.id; END IF;
    -- Expired or superseded: free the key so the same attempt can be retried with a new order.
    PERFORM public._release_order(v_existing.id, 'cancelled');
    UPDATE public.orders SET idempotency_key = NULL WHERE id = v_existing.id;
  END IF;

  SELECT * INTO v_option FROM public.delivery_options WHERE id = p_delivery AND active;
  IF NOT FOUND OR (v_option.kind = 'delivery' AND length(trim(coalesce(p_address,''))) < 5) THEN RAISE EXCEPTION 'Invalid delivery'; END IF;

  -- Natural idempotency: another tab or device submitting the same cart and delivery reuses the live order.
  SELECT o.id INTO v_order FROM public.orders o
    WHERE o.user_id = auth.uid() AND o.status = 'pending' AND o.reservation_expires_at > now()
      AND o.delivery_option_id = p_delivery AND o.contact_email = trim(p_contact->>'email')
      AND coalesce(o.shipping_address->>'address','') = CASE WHEN v_option.kind = 'delivery' THEN trim(p_address) ELSE '' END
      AND ARRAY(SELECT oi.product_item_id FROM public.order_items oi WHERE oi.order_id = o.id ORDER BY 1)
        = ARRAY(SELECT ci.product_item_id FROM public.shopping_cart_items ci WHERE ci.cart_id = v_cart ORDER BY 1)
    ORDER BY o.created_at DESC LIMIT 1;
  IF v_order IS NOT NULL THEN RETURN v_order; END IF;

  -- One pending order per buyer: a new attempt supersedes older unpaid ones, unless a payment is in flight.
  FOR v_prior IN SELECT o.id FROM public.orders o WHERE o.user_id = auth.uid() AND o.status = 'pending'
      AND o.payment_status IS DISTINCT FROM 'completed' ORDER BY o.id FOR UPDATE LOOP
    IF EXISTS (SELECT 1 FROM public.payment_events e WHERE e.order_id = v_prior.id AND e.status IN ('pending','in_process','authorized','approved')) THEN
      RAISE EXCEPTION 'Payment in progress';
    END IF;
    PERFORM public._release_order(v_prior.id, 'superseded');
  END LOOP;

  -- Lock the sellable units in stable order. Concurrent buyers of the last unit serialize here: first to reserve wins.
  FOR v_item IN
    SELECT i.id, i.price, i.stock, i.status, p.is_active, ci.price_at_add FROM public.shopping_cart_items ci
      JOIN public.product_items i ON i.id = ci.product_item_id
      JOIN public.product_variants v ON v.id = i.variant_id
      JOIN public.products p ON p.id = v.product_id
      WHERE ci.cart_id = v_cart ORDER BY i.id FOR NO KEY UPDATE OF i
  LOOP
    IF NOT v_item.is_active OR coalesce(v_item.status,'available') <> 'available' OR coalesce(v_item.stock,0) < 1 THEN RAISE EXCEPTION 'Item unavailable'; END IF;
    IF v_item.price <> v_item.price_at_add THEN RAISE EXCEPTION 'Price changed'; END IF;
    SELECT count(*) INTO v_held FROM public.item_reservations
      WHERE product_item_id = v_item.id AND status = 'active' AND expires_at > now();
    IF v_held >= v_item.stock THEN RAISE EXCEPTION 'Item reserved'; END IF;
    v_subtotal := v_subtotal + v_item.price; v_items := v_items || v_item.id;
  END LOOP;
  IF cardinality(v_items) = 0 THEN RAISE EXCEPTION 'Empty cart'; END IF;
  IF p_expected_total IS NULL OR p_expected_total <> v_subtotal + v_option.fee THEN RAISE EXCEPTION 'Total changed'; END IF;

  INSERT INTO public.orders(user_id,contact_name,contact_email,contact_phone,delivery_option_id,delivery_label,delivery_kind,
    shipping_address,currency,subtotal,delivery_fee,total,status,payment_status,reservation_expires_at,idempotency_key,cart_revision,access_token)
    VALUES (auth.uid(),trim(p_contact->>'name'),trim(p_contact->>'email'),trim(p_contact->>'phone'),p_delivery,v_option.label,
      v_option.kind,CASE WHEN v_option.kind = 'delivery' THEN jsonb_build_object('address',trim(p_address),'district',v_option.district) ELSE NULL END,
      'PEN',v_subtotal,v_option.fee,v_subtotal+v_option.fee,'pending','pending',now()+interval '15 minutes',p_key,v_revision,
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
    RETURNING id INTO v_order;
  INSERT INTO public.order_items(order_id,variant_id,product_item_id,price,quantity,title_snapshot,size_snapshot,condition_snapshot,image_snapshot)
    SELECT v_order,i.variant_id,i.id,i.price,1,p.name,v.size,i.condition,v.main_img_url
    FROM public.product_items i JOIN public.product_variants v ON v.id=i.variant_id JOIN public.products p ON p.id=v.product_id
    WHERE i.id = ANY(v_items);
  INSERT INTO public.item_reservations(order_id,product_item_id,expires_at)
    SELECT v_order, unnest(v_items), now()+interval '15 minutes';
  PERFORM public._bump_carts_for_items(v_items);
  RETURN v_order;
END $$;
REVOKE ALL ON FUNCTION public.prepare_checkout(uuid,jsonb,uuid,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_checkout(uuid,jsonb,uuid,text,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order record; v_count integer := 0;
BEGIN
  FOR v_order IN SELECT o.id FROM public.orders o WHERE o.status = 'pending'
      AND o.payment_status IS DISTINCT FROM 'completed' AND o.reservation_expires_at <= now()
      ORDER BY o.id FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._release_order(v_order.id, 'cancelled');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

-- Snapshot includes the buyer's own live reservation so the UI can show a countdown.
CREATE OR REPLACE FUNCTION public.cart_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  -- Both counters only grow, so their sum is a monotonic revision for the client.
  SELECT jsonb_build_object('revision',c.revision + coalesce((SELECT s.version FROM public.cart_signals s WHERE s.cart_id=c.id),0),'cart_id',c.id,
    'pending_order',(SELECT jsonb_build_object('id',o.id,'expires_at',o.reservation_expires_at,'access_token',o.access_token)
      FROM public.orders o WHERE o.user_id=auth.uid() AND o.status='pending' AND o.reservation_expires_at>now()
      ORDER BY o.created_at DESC LIMIT 1),
    'items',coalesce((
    SELECT jsonb_agg(jsonb_build_object('item_id',i.id,'product_id',p.id,'title',p.name,'size',v.size,
      'condition',i.condition,'price',i.price,'price_at_add',ci.price_at_add,'stock',i.stock,
      'status',i.status,'image',v.main_img_url,'available',p.is_active AND coalesce(i.stock,0) > (
        SELECT count(*) FROM public.item_reservations r JOIN public.orders o ON o.id=r.order_id
        WHERE r.product_item_id=i.id AND r.status='active' AND r.expires_at>now() AND o.user_id IS DISTINCT FROM auth.uid()
      ) AND coalesce(i.status,'available')='available') ORDER BY ci.created_at)
    FROM public.shopping_cart_items ci JOIN public.product_items i ON i.id=ci.product_item_id
      JOIN public.product_variants v ON v.id=i.variant_id JOIN public.products p ON p.id=v.product_id WHERE ci.cart_id=c.id
  ),'[]'::jsonb)) FROM public.shopping_carts c WHERE c.owner_id=auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.settle_payment(p_order uuid, p_payment text, p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_line record; v_others int; v_items uuid[] := '{}';
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown order'; END IF;
  INSERT INTO public.payment_events(payment_id,order_id,status) VALUES (p_payment,p_order,p_status)
    ON CONFLICT (payment_id) DO UPDATE SET status=excluded.status,updated_at=now()
    WHERE public.payment_events.status NOT IN ('settled','refunded');

  IF v_order.payment_status='completed' THEN
    IF p_status='approved' AND v_order.paid_payment_id IS DISTINCT FROM p_payment THEN RETURN 'duplicate_paid'; END IF;
    IF p_status IN ('refunded','charged_back') AND v_order.paid_payment_id = p_payment THEN
      UPDATE public.orders SET status='review', payment_status='refunded' WHERE id=p_order;
      RETURN 'refunded';
    END IF;
    RETURN 'completed';
  END IF;
  IF v_order.payment_status IN ('review','refunded') THEN RETURN 'review'; END IF;

  IF p_status='approved' THEN
    -- Lock the units; accept the payment if each unit is still ours or still free, even after expiry.
    FOR v_line IN SELECT oi.product_item_id FROM public.order_items oi WHERE oi.order_id=p_order ORDER BY oi.product_item_id LOOP
      PERFORM 1 FROM public.product_items WHERE id=v_line.product_item_id FOR NO KEY UPDATE;
      SELECT count(*) INTO v_others FROM public.item_reservations r
        WHERE r.product_item_id=v_line.product_item_id AND r.order_id<>p_order AND r.status='active' AND r.expires_at>now();
      IF NOT EXISTS (SELECT 1 FROM public.product_items i WHERE i.id=v_line.product_item_id AND coalesce(i.stock,0) - v_others >= 1) THEN
        UPDATE public.orders SET status='review',payment_status='review' WHERE id=p_order;
        PERFORM public._release_order(p_order, 'review');
        UPDATE public.payment_attempts SET status='refund_pending',updated_at=now() WHERE order_id=p_order AND status IN ('creating','ready');
        RETURN 'review';
      END IF;
      v_items := v_items || v_line.product_item_id;
    END LOOP;
    UPDATE public.product_items SET stock=stock-1 WHERE id = ANY(v_items);
    INSERT INTO public.item_reservations(order_id,product_item_id,expires_at,status)
      SELECT p_order, unnest(v_items), now(), 'consumed'
      ON CONFLICT (order_id,product_item_id) DO UPDATE SET status='consumed';
    UPDATE public.orders SET status='paid',payment_status='completed',paid_payment_id=p_payment WHERE id=p_order;
    -- Signal first (the buyer's cart still holds the items), then drop the sold units from it.
    PERFORM public._bump_carts_for_items(v_items);
    DELETE FROM public.shopping_cart_items ci USING public.shopping_carts c
      WHERE ci.cart_id=c.id AND c.owner_id=v_order.user_id AND ci.product_item_id = ANY(v_items);
    UPDATE public.payment_attempts SET status='approved',payment_id=p_payment,updated_at=now() WHERE order_id=p_order AND status IN ('creating','ready');
    RETURN 'completed';
  END IF;

  IF p_status IN ('rejected','cancelled') THEN
    UPDATE public.payment_attempts SET status=p_status,updated_at=now() WHERE order_id=p_order AND status IN ('creating','ready');
    UPDATE public.orders SET payment_status='failed' WHERE id=p_order;
  END IF;
  RETURN p_status;
END $$;
REVOKE ALL ON FUNCTION public.settle_payment(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_record_whatsapp_sale(p_item uuid, p_name text, p_email text, p_phone text, p_payment_verified boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_item record; v_held int; v_order uuid;
BEGIN
  IF NOT public.is_admin() OR p_payment_verified IS NOT TRUE THEN RAISE EXCEPTION 'Administrator must verify payment'; END IF;
  IF p_name IS NULL OR p_phone IS NULL OR length(trim(p_name))<2 OR length(trim(p_phone))<6 THEN RAISE EXCEPTION 'Invalid buyer contact'; END IF;
  SELECT i.*,v.size,v.main_img_url,p.name AS title,p.is_active INTO v_item FROM public.product_items i
    JOIN public.product_variants v ON v.id=i.variant_id JOIN public.products p ON p.id=v.product_id
    WHERE i.id=p_item FOR NO KEY UPDATE OF i;
  IF NOT FOUND OR NOT v_item.is_active OR coalesce(v_item.stock,0)<1 OR coalesce(v_item.status,'available')<>'available' THEN RAISE EXCEPTION 'Item unavailable'; END IF;
  SELECT count(*) INTO v_held FROM public.item_reservations WHERE product_item_id=p_item AND status='active' AND expires_at>now();
  IF v_held>=v_item.stock THEN RAISE EXCEPTION 'Item reserved'; END IF;
  INSERT INTO public.orders(user_id,contact_name,contact_email,contact_phone,currency,subtotal,delivery_fee,total,status,payment_status,metadata)
    VALUES (NULL,trim(p_name),nullif(trim(p_email),''),trim(p_phone),'PEN',v_item.price,0,v_item.price,'paid','completed',
      jsonb_build_object('channel','whatsapp','payment_verified_by',auth.uid())) RETURNING id INTO v_order;
  INSERT INTO public.order_items(order_id,variant_id,product_item_id,price,quantity,title_snapshot,size_snapshot,condition_snapshot,image_snapshot)
    VALUES (v_order,v_item.variant_id,p_item,v_item.price,1,v_item.title,v_item.size,v_item.condition,v_item.main_img_url);
  UPDATE public.product_items SET stock=stock-1 WHERE id=p_item;
  PERFORM public._bump_carts_for_items(ARRAY[p_item]);
  RETURN v_order;
END $$;

CREATE OR REPLACE FUNCTION public.admin_transition_order(p_order uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_action='deliver' AND v_order.status='paid' THEN
    UPDATE public.orders SET status='delivered' WHERE id=p_order;
  ELSIF p_action='cancel' AND v_order.payment_status IS DISTINCT FROM 'completed' THEN
    PERFORM public._release_order(p_order, 'cancelled');
  ELSE RAISE EXCEPTION 'Invalid transition or refund required'; END IF;
END $$;

-- Guest order lookup from any device with the unguessable link token.
CREATE OR REPLACE FUNCTION public.order_by_token(p_order uuid, p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id',o.id,'status',o.status,'payment_status',o.payment_status,'total',o.total,'subtotal',o.subtotal,
    'delivery_fee',o.delivery_fee,'delivery_label',o.delivery_label,'delivery_kind',o.delivery_kind,
    'reservation_expires_at',o.reservation_expires_at,'created_at',o.created_at,
    'order_items',coalesce((SELECT jsonb_agg(jsonb_build_object('title_snapshot',oi.title_snapshot,'size_snapshot',oi.size_snapshot,
      'condition_snapshot',oi.condition_snapshot,'image_snapshot',oi.image_snapshot,'price',oi.price,'quantity',oi.quantity))
      FROM public.order_items oi WHERE oi.order_id=o.id),'[]'::jsonb))
  FROM public.orders o WHERE o.id=p_order AND p_token IS NOT NULL AND length(p_token)=64 AND o.access_token=p_token;
$$;
REVOKE ALL ON FUNCTION public.order_by_token(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_by_token(uuid,text) TO anon, authenticated;

-- Expired reservations are released inside Postgres every minute, independent of the hosting provider.
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations') THEN
    PERFORM cron.unschedule('release-expired-reservations');
  END IF;
  PERFORM cron.schedule('release-expired-reservations', '* * * * *', 'SELECT public.release_expired_reservations()');
END $$;
