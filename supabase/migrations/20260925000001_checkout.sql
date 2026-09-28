-- Checkout data is owned by controlled functions. Clients can read only their own rows.
-- The legacy variant-level cart is retired without guessing which item a variant meant.
DROP POLICY IF EXISTS cart_delete_own ON public.cart_items;
DROP POLICY IF EXISTS cart_insert_own ON public.cart_items;
DROP POLICY IF EXISTS cart_select_own ON public.cart_items;
DROP POLICY IF EXISTS cart_update_own ON public.cart_items;
REVOKE ALL ON public.cart_items FROM anon, authenticated;
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS orders_update_own ON public.orders;
DROP POLICY IF EXISTS orders_delete_admin ON public.orders;
DROP POLICY IF EXISTS order_items_insert_own ON public.order_items;
DROP POLICY IF EXISTS order_items_update_own ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_own ON public.order_items;
REVOKE INSERT, UPDATE, DELETE ON public.orders, public.order_items FROM anon, authenticated;

CREATE TABLE public.shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.shopping_cart_items (
  cart_id uuid NOT NULL REFERENCES public.shopping_carts(id) ON DELETE CASCADE,
  product_item_id uuid NOT NULL REFERENCES public.product_items(id) ON DELETE CASCADE,
  price_at_add numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, product_item_id)
);
CREATE INDEX shopping_cart_items_item_idx ON public.shopping_cart_items(product_item_id);
ALTER TABLE public.shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopping_carts_select_own ON public.shopping_carts FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
CREATE POLICY shopping_cart_items_select_own ON public.shopping_cart_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.shopping_carts c WHERE c.id = cart_id AND c.owner_id = (SELECT auth.uid()))
);
GRANT SELECT ON public.shopping_carts, public.shopping_cart_items TO authenticated;

CREATE OR REPLACE FUNCTION public.cart_change(p_item_id uuid, p_action text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_cart uuid; v_price numeric(10,2); v_revision bigint;
BEGIN
  IF auth.uid() IS NULL OR p_action NOT IN ('add','remove') THEN RAISE EXCEPTION 'Invalid cart operation'; END IF;
  INSERT INTO public.shopping_carts(owner_id) VALUES (auth.uid()) ON CONFLICT (owner_id) DO NOTHING;
  SELECT id INTO v_cart FROM public.shopping_carts WHERE owner_id = auth.uid() FOR UPDATE;
  IF p_action = 'add' THEN
    SELECT i.price INTO v_price FROM public.product_items i
      JOIN public.product_variants v ON v.id = i.variant_id
      JOIN public.products p ON p.id = v.product_id
      WHERE i.id = p_item_id AND p.is_active AND i.stock > 0 AND coalesce(i.status,'available') = 'available';
    IF v_price IS NULL THEN RAISE EXCEPTION 'Item unavailable'; END IF;
    INSERT INTO public.shopping_cart_items(cart_id, product_item_id, price_at_add)
      VALUES (v_cart, p_item_id, v_price) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.shopping_cart_items WHERE cart_id = v_cart AND product_item_id = p_item_id;
  END IF;
  UPDATE public.shopping_carts SET revision = revision + 1, updated_at = now() WHERE id = v_cart RETURNING revision INTO v_revision;
  RETURN v_revision;
END $$;
REVOKE ALL ON FUNCTION public.cart_change(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cart_change(uuid,text) TO authenticated;

-- Only the server calls this after verifying both the old guest JWT and current user.
CREATE OR REPLACE FUNCTION public.cart_merge_verified(p_guest uuid, p_owner uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_guest_cart uuid; v_owner_cart uuid;
BEGIN
  IF p_guest = p_owner THEN RETURN; END IF;
  INSERT INTO public.shopping_carts(owner_id) VALUES (p_owner) ON CONFLICT (owner_id) DO NOTHING;
  SELECT id INTO v_owner_cart FROM public.shopping_carts WHERE owner_id = p_owner FOR UPDATE;
  SELECT id INTO v_guest_cart FROM public.shopping_carts WHERE owner_id = p_guest FOR UPDATE;
  IF v_guest_cart IS NULL THEN RETURN; END IF;
  INSERT INTO public.shopping_cart_items(cart_id, product_item_id, price_at_add)
    SELECT v_owner_cart, product_item_id, price_at_add FROM public.shopping_cart_items WHERE cart_id = v_guest_cart
    ON CONFLICT DO NOTHING;
  DELETE FROM public.shopping_cart_items WHERE cart_id = v_guest_cart;
  UPDATE public.shopping_carts SET revision = revision + 1, updated_at = now() WHERE id = v_owner_cart;
END $$;
REVOKE ALL ON FUNCTION public.cart_merge_verified(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cart_merge_verified(uuid,uuid) TO service_role;

CREATE TABLE public.delivery_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('pickup','delivery')),
  label text NOT NULL,
  district text,
  fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  active boolean NOT NULL DEFAULT false,
  CHECK (kind = 'pickup' OR district IS NOT NULL)
);
ALTER TABLE public.delivery_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_options_public ON public.delivery_options FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY delivery_options_admin ON public.delivery_options TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.delivery_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_options TO authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_option_id uuid REFERENCES public.delivery_options(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_label text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_kind text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PEN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key uuid;
CREATE UNIQUE INDEX orders_owner_idempotency_idx ON public.orders(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_item_id uuid REFERENCES public.product_items(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS title_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS condition_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS image_snapshot text;
CREATE TABLE public.item_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_item_id uuid NOT NULL REFERENCES public.product_items(id),
  quantity int NOT NULL DEFAULT 1 CHECK (quantity = 1),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','consumed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,product_item_id)
);
CREATE INDEX item_reservations_active_idx ON public.item_reservations(product_item_id,expires_at) WHERE status = 'active';
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercado_pago',
  preference_id text UNIQUE,
  payment_id text UNIQUE,
  checkout_url text,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_attempts_one_per_order_idx ON public.payment_attempts(order_id);
CREATE INDEX payment_attempts_order_idx ON public.payment_attempts(order_id,created_at DESC);
CREATE TABLE public.payment_events (
  payment_id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_order_idx ON public.payment_events(order_id);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_events_admin_read ON public.payment_events FOR SELECT TO authenticated USING (public.is_admin());
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.shopping_carts, public.shopping_cart_items, public.delivery_options,
  public.item_reservations, public.payment_attempts, public.payment_events TO service_role;
ALTER TABLE public.item_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_reservations_owner_read ON public.item_reservations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = (SELECT auth.uid()))
);
CREATE POLICY payment_attempts_owner_read ON public.payment_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = (SELECT auth.uid()))
);
GRANT SELECT ON public.item_reservations, public.payment_attempts TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_checkout(p_key uuid, p_contact jsonb, p_delivery uuid, p_address text, p_expected_total numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_cart uuid; v_item record; v_option public.delivery_options%ROWTYPE; v_order uuid; v_subtotal numeric(10,2) := 0; v_count int := 0; v_held int;
BEGIN
  IF auth.uid() IS NULL OR p_key IS NULL OR p_contact->>'name' IS NULL OR p_contact->>'phone' IS NULL
    OR p_contact->>'email' IS NULL OR length(trim(p_contact->>'name')) < 2
    OR length(trim(p_contact->>'phone')) < 6 OR length(trim(p_contact->>'email')) < 5 THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  SELECT id INTO v_order FROM public.orders WHERE user_id = auth.uid() AND idempotency_key = p_key;
  IF v_order IS NOT NULL THEN RETURN v_order; END IF;
  SELECT * INTO v_option FROM public.delivery_options WHERE id = p_delivery AND active;
  IF NOT FOUND OR (v_option.kind = 'delivery' AND length(trim(coalesce(p_address,''))) < 5) THEN RAISE EXCEPTION 'Invalid delivery'; END IF;
  SELECT id INTO v_cart FROM public.shopping_carts WHERE owner_id = auth.uid() FOR UPDATE;
  IF v_cart IS NULL THEN RAISE EXCEPTION 'Empty cart'; END IF;
  -- Lock the sellable units in stable order. Concurrent buyers of the last unit serialize here.
  FOR v_item IN
    SELECT i.id, i.variant_id, i.price, i.stock, i.status, v.size, v.main_img_url, p.name, p.is_active, i.condition,
      ci.price_at_add FROM public.shopping_cart_items ci
      JOIN public.product_items i ON i.id = ci.product_item_id
      JOIN public.product_variants v ON v.id = i.variant_id
      JOIN public.products p ON p.id = v.product_id
      WHERE ci.cart_id = v_cart ORDER BY i.id FOR UPDATE OF i
  LOOP
    IF NOT v_item.is_active OR coalesce(v_item.status,'available') <> 'available' OR v_item.stock < 1
      OR v_item.price <> v_item.price_at_add THEN RAISE EXCEPTION 'Cart changed'; END IF;
    SELECT count(*) INTO v_held FROM public.item_reservations
      WHERE product_item_id = v_item.id AND status = 'active' AND expires_at > now();
    IF v_held >= v_item.stock THEN RAISE EXCEPTION 'Item reserved'; END IF;
    v_subtotal := v_subtotal + v_item.price; v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'Empty cart'; END IF;
  IF p_expected_total IS NULL OR p_expected_total <> v_subtotal + v_option.fee THEN RAISE EXCEPTION 'Total changed'; END IF;
  INSERT INTO public.orders(user_id,contact_name,contact_email,contact_phone,delivery_option_id,delivery_label,delivery_kind,
    shipping_address,currency,subtotal,delivery_fee,total,status,payment_status,reservation_expires_at,idempotency_key)
    VALUES (auth.uid(),trim(p_contact->>'name'),trim(p_contact->>'email'),trim(p_contact->>'phone'),p_delivery,v_option.label,
      v_option.kind,CASE WHEN v_option.kind = 'delivery' THEN jsonb_build_object('address',trim(p_address),'district',v_option.district) ELSE NULL END,
      'PEN',v_subtotal,v_option.fee,v_subtotal+v_option.fee,'pending','pending',now()+interval '15 minutes',p_key)
    RETURNING id INTO v_order;
  INSERT INTO public.order_items(order_id,variant_id,product_item_id,price,quantity,title_snapshot,size_snapshot,condition_snapshot,image_snapshot)
    SELECT v_order,i.variant_id,i.id,i.price,1,p.name,v.size,i.condition,v.main_img_url
    FROM public.shopping_cart_items ci JOIN public.product_items i ON i.id=ci.product_item_id
    JOIN public.product_variants v ON v.id=i.variant_id JOIN public.products p ON p.id=v.product_id WHERE ci.cart_id=v_cart;
  INSERT INTO public.item_reservations(order_id,product_item_id,expires_at)
    SELECT v_order,product_item_id,now()+interval '15 minutes' FROM public.shopping_cart_items WHERE cart_id=v_cart;
  RETURN v_order;
END $$;
REVOKE ALL ON FUNCTION public.prepare_checkout(uuid,jsonb,uuid,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_checkout(uuid,jsonb,uuid,text,numeric) TO authenticated;

-- Called by the protected reconciliation endpoint; never release a paid order.
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.item_reservations r SET status='released'
    FROM public.orders o WHERE o.id=r.order_id AND r.status='active' AND r.expires_at <= now() AND o.payment_status <> 'completed';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.orders SET status='cancelled' WHERE status='pending' AND payment_status <> 'completed'
    AND reservation_expires_at <= now();
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

-- Realtime emits only the cart header, which contains no private product data.
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_carts;

CREATE OR REPLACE FUNCTION public.cart_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('revision',coalesce(c.revision,0),'cart_id',c.id,'items',coalesce((
    SELECT jsonb_agg(jsonb_build_object('item_id',i.id,'product_id',p.id,'title',p.name,'size',v.size,
      'condition',i.condition,'price',i.price,'price_at_add',ci.price_at_add,'stock',i.stock,
      'status',i.status,'image',v.main_img_url,'available',p.is_active AND i.stock > (
        SELECT count(*) FROM public.item_reservations r JOIN public.orders o ON o.id=r.order_id
        WHERE r.product_item_id=i.id AND r.status='active' AND r.expires_at>now() AND o.user_id<>auth.uid()
      ) AND coalesce(i.status,'available')='available') ORDER BY ci.created_at)
    FROM public.shopping_cart_items ci JOIN public.product_items i ON i.id=ci.product_item_id
      JOIN public.product_variants v ON v.id=i.variant_id JOIN public.products p ON p.id=v.product_id WHERE ci.cart_id=c.id
  ),'[]'::jsonb)) FROM public.shopping_carts c WHERE c.owner_id=auth.uid();
$$;
REVOKE ALL ON FUNCTION public.cart_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cart_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_payment(p_order uuid, p_payment text, p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_line record; v_active int;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown order'; END IF;
  INSERT INTO public.payment_events(payment_id,order_id,status) VALUES (p_payment,p_order,p_status)
    ON CONFLICT (payment_id) DO UPDATE SET status=excluded.status,updated_at=now();
  IF v_order.payment_status='completed' THEN
    IF EXISTS (SELECT 1 FROM public.payment_attempts WHERE order_id=p_order AND payment_id<>p_payment) AND p_status='approved' THEN RETURN 'duplicate_paid'; END IF;
    RETURN 'completed';
  END IF;
  IF p_status='approved' THEN
    IF v_order.reservation_expires_at <= now() OR v_order.status IN ('cancelled','review') THEN
      UPDATE public.orders SET status='review',payment_status='review' WHERE id=p_order;
      UPDATE public.payment_attempts SET status='refund_pending',payment_id=p_payment,updated_at=now() WHERE order_id=p_order;
      RETURN 'review';
    END IF;
    FOR v_line IN SELECT r.product_item_id FROM public.item_reservations r WHERE r.order_id=p_order ORDER BY r.product_item_id LOOP
      PERFORM 1 FROM public.product_items WHERE id=v_line.product_item_id AND stock>0 FOR UPDATE;
      IF NOT FOUND THEN
        UPDATE public.orders SET status='review',payment_status='review' WHERE id=p_order;
        UPDATE public.payment_attempts SET status='refund_pending',payment_id=p_payment,updated_at=now() WHERE order_id=p_order;
        RETURN 'review';
      END IF;
      SELECT count(*) INTO v_active FROM public.item_reservations r
        WHERE r.order_id=p_order AND r.product_item_id=v_line.product_item_id AND r.status='active' AND r.expires_at>now();
      IF v_active<>1 THEN
        UPDATE public.orders SET status='review',payment_status='review' WHERE id=p_order;
        UPDATE public.payment_attempts SET status='refund_pending',payment_id=p_payment,updated_at=now() WHERE order_id=p_order;
        RETURN 'review';
      END IF;
    END LOOP;
    UPDATE public.product_items i SET stock=i.stock-1 WHERE i.id IN
      (SELECT product_item_id FROM public.item_reservations WHERE order_id=p_order AND status='active') AND i.stock>0;
    UPDATE public.item_reservations SET status='consumed' WHERE order_id=p_order AND status='active';
    UPDATE public.orders SET status='paid',payment_status='completed' WHERE id=p_order;
    DELETE FROM public.shopping_cart_items ci USING public.shopping_carts c
      WHERE ci.cart_id=c.id AND c.owner_id=v_order.user_id AND ci.product_item_id IN
        (SELECT product_item_id FROM public.item_reservations WHERE order_id=p_order);
    UPDATE public.shopping_carts SET revision=revision+1,updated_at=now() WHERE owner_id=v_order.user_id;
    UPDATE public.payment_attempts SET status='approved',payment_id=p_payment,updated_at=now() WHERE order_id=p_order;
    RETURN 'completed';
  END IF;
  UPDATE public.payment_attempts SET status=p_status, payment_id=p_payment, updated_at=now() WHERE order_id=p_order;
  IF p_status IN ('rejected','cancelled') THEN
    UPDATE public.orders SET payment_status='failed' WHERE id=p_order AND payment_status<>'completed';
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
    WHERE i.id=p_item FOR UPDATE OF i;
  IF NOT FOUND OR NOT v_item.is_active OR v_item.stock<1 OR coalesce(v_item.status,'available')<>'available' THEN RAISE EXCEPTION 'Item unavailable'; END IF;
  SELECT count(*) INTO v_held FROM public.item_reservations WHERE product_item_id=p_item AND status='active' AND expires_at>now();
  IF v_held>=v_item.stock THEN RAISE EXCEPTION 'Item reserved'; END IF;
  INSERT INTO public.orders(user_id,contact_name,contact_email,contact_phone,currency,subtotal,delivery_fee,total,status,payment_status,metadata)
    VALUES (NULL,trim(p_name),nullif(trim(p_email),''),trim(p_phone),'PEN',v_item.price,0,v_item.price,'paid','completed',
      jsonb_build_object('channel','whatsapp','payment_verified_by',auth.uid())) RETURNING id INTO v_order;
  INSERT INTO public.order_items(order_id,variant_id,product_item_id,price,quantity,title_snapshot,size_snapshot,condition_snapshot,image_snapshot)
    VALUES (v_order,v_item.variant_id,p_item,v_item.price,1,v_item.title,v_item.size,v_item.condition,v_item.main_img_url);
  UPDATE public.product_items SET stock=stock-1 WHERE id=p_item;
  RETURN v_order;
END $$;
REVOKE ALL ON FUNCTION public.admin_record_whatsapp_sale(uuid,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_record_whatsapp_sale(uuid,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_transition_order(p_order uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_action='deliver' AND v_order.status='paid' THEN
    UPDATE public.orders SET status='delivered' WHERE id=p_order;
  ELSIF p_action='cancel' AND v_order.payment_status<>'completed' THEN
    UPDATE public.orders SET status='cancelled' WHERE id=p_order;
    UPDATE public.item_reservations SET status='released' WHERE order_id=p_order AND status='active';
  ELSE RAISE EXCEPTION 'Invalid transition or refund required'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_transition_order(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_transition_order(uuid,text) TO authenticated;
