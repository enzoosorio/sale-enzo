#!/usr/bin/env bash
# Two real concurrent transactions try to reserve the same last unit. Exactly one must win.
# Usage: bash scripts/test-checkout-race.sh   (local Supabase must be running)
set -euo pipefail
DB="${SUPABASE_DB_CONTAINER:-$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)}"
psql() { docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

A=00000000-0000-4000-a100-00000000000a; B=00000000-0000-4000-a100-00000000000b
PRODUCT=00000000-0000-4000-b100-000000000001; VARIANT=00000000-0000-4000-c100-000000000001
ITEM=00000000-0000-4000-d100-000000000001; OPTION=00000000-0000-4000-e100-000000000001

cleanup() {
  psql <<SQL >/dev/null
DELETE FROM public.item_reservations WHERE product_item_id = '$ITEM';
DELETE FROM public.orders WHERE user_id IN ('$A','$B');
DELETE FROM public.shopping_carts WHERE owner_id IN ('$A','$B');
DELETE FROM public.product_items WHERE id = '$ITEM';
DELETE FROM public.product_variants WHERE id = '$VARIANT';
DELETE FROM public.products WHERE id = '$PRODUCT';
DELETE FROM public.delivery_options WHERE id = '$OPTION';
DELETE FROM auth.users WHERE id IN ('$A','$B');
SQL
}
trap cleanup EXIT
cleanup

psql <<SQL >/dev/null
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ('$A','race-a@test.local','{}'), ('$B','race-b@test.local','{}');
INSERT INTO public.products(id, name, is_active) VALUES ('$PRODUCT', 'Race test', true);
INSERT INTO public.product_variants(id, product_id, size, main_img_url) VALUES ('$VARIANT', '$PRODUCT', 'M', 'https://example.test/r.webp');
INSERT INTO public.product_items(id, variant_id, price, stock, status) VALUES ('$ITEM', '$VARIANT', 80, 1, 'available');
INSERT INTO public.delivery_options(id, kind, label, fee, active) VALUES ('$OPTION', 'pickup', 'Race point', 0, true);
SQL

attempt() { # $1 user, $2 key
  psql <<SQL 2>&1 || true
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true) \\g /dev/null
SELECT public.cart_change('$ITEM', 'add') \\g /dev/null
SELECT 'WON ' || public.prepare_checkout('$2', '{"name":"Race","email":"r@test.local","phone":"999999999"}', '$OPTION', '', 80);
SELECT pg_sleep(1) \\g /dev/null
COMMIT;
SQL
}

OUT=$(mktemp -d)
attempt "$A" 30000000-0000-4000-8000-000000000001 > $OUT/race-a.txt &
attempt "$B" 30000000-0000-4000-8000-000000000002 > $OUT/race-b.txt &
wait

wins=$(cat $OUT/race-a.txt $OUT/race-b.txt | grep -c '^WON' || true)
reserved=$(cat $OUT/race-a.txt $OUT/race-b.txt | grep -c 'Item reserved' || true)
active=$(psql -c "SELECT count(*) FROM public.item_reservations WHERE product_item_id = '$ITEM' AND status = 'active'")
echo "A: $(tr '\n' ' ' < $OUT/race-a.txt)"
echo "B: $(tr '\n' ' ' < $OUT/race-b.txt)"
if [[ "$wins" == 1 && "$reserved" == 1 && "$active" == 1 ]]; then echo "PASS: exactly one buyer reserved the last unit"; else echo "FAIL: wins=$wins reserved=$reserved active=$active"; exit 1; fi
