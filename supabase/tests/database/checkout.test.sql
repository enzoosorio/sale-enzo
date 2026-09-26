-- Cart and checkout invariants. Runs inside a transaction and rolls back: `npx supabase test db`.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(32);

-- Fixtures: three buyers (one guest), one unique second-hand item, one pickup point.
INSERT INTO auth.users(id, email, raw_user_meta_data, is_anonymous) VALUES
  ('00000000-0000-4000-a000-00000000000a', 'a@test.local', '{}', false),
  ('00000000-0000-4000-a000-00000000000b', 'b@test.local', '{}', false),
  ('00000000-0000-4000-a000-00000000000c', NULL, '{}', true);
INSERT INTO public.products(id, name, is_active) VALUES ('00000000-0000-4000-b000-000000000001', 'Chaqueta test', true);
INSERT INTO public.product_variants(id, product_id, size, main_img_url) VALUES ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', 'M', 'https://example.test/m.webp');
INSERT INTO public.product_items(id, variant_id, price, stock, status) VALUES
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', 100, 1, 'available'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000001', 50, 1, 'available');
INSERT INTO public.delivery_options(id, kind, label, fee, active) VALUES ('00000000-0000-4000-e000-000000000001', 'pickup', 'Punto test', 0, true);

CREATE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
CREATE FUNCTION pg_temp.checkout(p_key uuid, p_total numeric DEFAULT 100) RETURNS uuid LANGUAGE sql AS $$
  SELECT public.prepare_checkout(p_key, '{"name":"Comprador","email":"c@test.local","phone":"999999999"}',
    '00000000-0000-4000-e000-000000000001', '', p_total);
$$;
CREATE TEMP TABLE ids(name text PRIMARY KEY, id uuid);
GRANT ALL ON ids TO authenticated;

-- Adding to a cart never reserves: both buyers can hold the last unit in their carts.
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
SELECT lives_ok($$ SELECT public.cart_change('00000000-0000-4000-d000-000000000001', 'add') $$, 'A adds the last unit');
SELECT lives_ok($$ SELECT public.cart_change('00000000-0000-4000-d000-000000000001', 'add') $$, 'adding twice is idempotent');
SELECT is(jsonb_array_length(public.cart_snapshot()->'items'), 1, 'set semantics: one line per item');
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000b');
SELECT lives_ok($$ SELECT public.cart_change('00000000-0000-4000-d000-000000000001', 'add') $$, 'B adds the same unit');
SELECT (public.cart_snapshot()->>'revision')::bigint AS b_rev \gset

-- First to reserve wins.
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
INSERT INTO ids VALUES ('a1', pg_temp.checkout('10000000-0000-4000-8000-000000000001'));
SELECT isnt((SELECT id FROM ids WHERE name = 'a1'), NULL, 'A reserves the unit');
SELECT is(pg_temp.checkout('10000000-0000-4000-8000-000000000001'), (SELECT id FROM ids WHERE name = 'a1'), 'same idempotency key returns the same order');
SELECT isnt(public.cart_snapshot()->'pending_order', 'null'::jsonb, 'A sees the live reservation');
SELECT is((public.cart_snapshot()->'items'->0->>'available')::boolean, true, 'own reservation keeps the item available to A');

SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000b');
SELECT throws_like($$ SELECT pg_temp.checkout('20000000-0000-4000-8000-000000000001') $$, '%Item reserved%', 'B loses the race for the last unit');
SELECT ok((public.cart_snapshot()->>'revision')::bigint > :b_rev, 'A''s reservation bumps B''s cart revision (Realtime push)');
SELECT is((public.cart_snapshot()->'items'->0->>'available')::boolean, false, 'B sees the unit as unavailable');

-- Privacy and write boundaries.
SELECT is((SELECT count(*) FROM public.orders WHERE user_id = '00000000-0000-4000-a000-00000000000a'), 0::bigint, 'B cannot read A''s orders');
SELECT is((SELECT count(*) FROM public.shopping_carts WHERE owner_id = '00000000-0000-4000-a000-00000000000a'), 0::bigint, 'B cannot read A''s cart');
SELECT throws_ok($$ UPDATE public.orders SET total = 0 $$, '42501', NULL, 'clients cannot update orders');
SELECT throws_ok($$ SELECT public.settle_payment((SELECT id FROM ids WHERE name = 'a1'), '1', 'approved') $$, '42501', NULL, 'clients cannot settle payments');
SELECT throws_ok($$ SELECT public.cart_merge_verified('00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000b') $$, '42501', NULL, 'clients cannot merge carts');
SELECT is(public.order_by_token((SELECT id FROM ids WHERE name = 'a1'), repeat('0', 64)), NULL, 'wrong access token reveals nothing');

-- Retrying with a new key supersedes the buyer's own unpaid order instead of self-blocking.
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
INSERT INTO ids VALUES ('a2', pg_temp.checkout('10000000-0000-4000-8000-000000000002'));
RESET ROLE;
SELECT is((SELECT status FROM public.orders WHERE id = (SELECT id FROM ids WHERE name = 'a1')), 'superseded', 'older unpaid order is superseded');
SELECT is((SELECT count(*) FROM public.item_reservations WHERE status = 'active' AND product_item_id = '00000000-0000-4000-d000-000000000001'), 1::bigint, 'only one active reservation per unit');
SELECT is((public.order_by_token(o.id, o.access_token)->>'id')::uuid, o.id, 'access token opens the guest order link')
  FROM public.orders o WHERE o.id = (SELECT id FROM ids WHERE name = 'a2');

-- Expiry releases the unit (pg_cron runs this every minute); then B can buy it.
UPDATE public.orders SET reservation_expires_at = now() - interval '1 minute' WHERE id = (SELECT id FROM ids WHERE name = 'a2');
UPDATE public.item_reservations SET expires_at = now() - interval '1 minute' WHERE order_id = (SELECT id FROM ids WHERE name = 'a2');
SELECT is(public.release_expired_reservations(), 1, 'expired order is released');
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000b');
INSERT INTO ids VALUES ('b1', pg_temp.checkout('20000000-0000-4000-8000-000000000002'));
RESET ROLE;

-- Late approval of A while B holds the unit goes to review (refund); B's payment wins.
SELECT is(public.settle_payment((SELECT id FROM ids WHERE name = 'a2'), '9001', 'approved'), 'review', 'late approval without inventory goes to review');
SELECT is(public.settle_payment((SELECT id FROM ids WHERE name = 'b1'), '9002', 'approved'), 'completed', 'B''s approval completes the sale');
SELECT is(public.settle_payment((SELECT id FROM ids WHERE name = 'b1'), '9002', 'approved'), 'completed', 'duplicate webhook is idempotent');
SELECT is((SELECT stock FROM public.product_items WHERE id = '00000000-0000-4000-d000-000000000001'), 0, 'stock is decremented exactly once');
SELECT is(public.settle_payment((SELECT id FROM ids WHERE name = 'b1'), '9003', 'approved'), 'duplicate_paid', 'a second payment for a paid order is flagged for refund');

-- Late approval with free inventory is honoured instead of refunded.
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
SELECT public.cart_change('00000000-0000-4000-d000-000000000001', 'remove');
SELECT public.cart_change('00000000-0000-4000-d000-000000000002', 'add');
INSERT INTO ids VALUES ('a3', pg_temp.checkout('10000000-0000-4000-8000-000000000003', 50));
RESET ROLE;
UPDATE public.orders SET reservation_expires_at = now() - interval '1 minute' WHERE id = (SELECT id FROM ids WHERE name = 'a3');
UPDATE public.item_reservations SET expires_at = now() - interval '1 minute' WHERE order_id = (SELECT id FROM ids WHERE name = 'a3');
SELECT public.release_expired_reservations();
SELECT is(public.settle_payment((SELECT id FROM ids WHERE name = 'a3'), '9004', 'approved'), 'completed', 'late approval with free inventory completes');

-- Price changes must be accepted explicitly.
UPDATE public.product_items SET stock = 1, price = 120 WHERE id = '00000000-0000-4000-d000-000000000002';
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
SELECT public.cart_change('00000000-0000-4000-d000-000000000002', 'add');
RESET ROLE;
UPDATE public.shopping_cart_items SET price_at_add = 50 WHERE product_item_id = '00000000-0000-4000-d000-000000000002';
SET LOCAL ROLE authenticated;
SELECT throws_like($$ SELECT pg_temp.checkout('10000000-0000-4000-8000-000000000004', 120) $$, '%Price changed%', 'stale price blocks checkout');
SELECT lives_ok($$ SELECT public.cart_change('00000000-0000-4000-d000-000000000002', 'accept_price') $$, 'buyer accepts the new price');
SELECT isnt(pg_temp.checkout('10000000-0000-4000-8000-000000000005', 120), NULL, 'checkout proceeds at the accepted price');

-- Guest cart and guest orders move to the account on sign-in.
SELECT pg_temp.as_user('00000000-0000-4000-a000-00000000000c');
RESET ROLE;
UPDATE public.product_items SET stock = 1 WHERE id = '00000000-0000-4000-d000-000000000001';
SET LOCAL ROLE authenticated;
SELECT public.cart_change('00000000-0000-4000-d000-000000000001', 'add');
RESET ROLE;
SELECT public.cart_merge_verified('00000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000b');
SELECT is((SELECT count(*) FROM public.shopping_carts WHERE owner_id = '00000000-0000-4000-a000-00000000000c'), 0::bigint, 'guest cart is removed after merge');
SELECT ok(EXISTS (SELECT 1 FROM public.shopping_cart_items ci JOIN public.shopping_carts c ON c.id = ci.cart_id
  WHERE c.owner_id = '00000000-0000-4000-a000-00000000000b' AND ci.product_item_id = '00000000-0000-4000-d000-000000000001'), 'guest items land in the account cart');

SELECT * FROM finish();
ROLLBACK;
