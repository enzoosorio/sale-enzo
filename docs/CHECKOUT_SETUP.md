# Checkout setup

The purchase flow is deliberately disabled until Mercado Pago and delivery details have been verified. Do not set `MERCADO_PAGO_CHECKOUT_ENABLED=true` before completing these steps.

1. Apply `supabase/migrations/20260925000001_checkout.sql` and `20260926000001_checkout_hardening.sql` locally (`npx supabase migration up --local`) and run `npm run test:db` and `npm run test:race`. Never reset the linked project. Apply the versioned migrations to the remote database only after local validation and backup. The hardening migration enables `pg_cron`; on hosted Supabase confirm the extension is allowed in *Database → Extensions*.
2. Enable anonymous sign-ins in the hosted Supabase Auth settings. Local development uses `supabase/config.toml`. Anonymous identities have the `authenticated` database role, so review all authenticated policies before enabling hosted sign-ins. Enable CAPTCHA (Cloudflare Turnstile) for anonymous sign-ins to limit inventory hoarding by scripts; the database already caps carts at 20 items and one live reservation per buyer.
3. Set `CART_MERGE_SECRET` (32+ random bytes, server-only). It signs the httpOnly cookie that lets the proxy move a guest cart and guest orders into the account after any sign-in method.
4. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the international number without a plus sign. Configure real pickup points and covered districts with fees in `/admin/delivery`. Only active options appear in checkout.
5. Set the server-only `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, and `MERCADO_PAGO_COLLECTOR_ID`. Set `SITE_URL` to the public HTTPS origin. Configure Mercado Pago payment webhooks at `${SITE_URL}/api/payments/mercado-pago/webhook` for the `payment` event. Test with seller and buyer test accounts. The return URL is display-only; it never marks an order paid.
6. Set `CHECKOUT_CRON_SECRET` and schedule an authenticated `POST /api/payments/reconcile` every few minutes with `Authorization: Bearer <secret>`. It re-checks unfinished payments, finds payments whose webhook never arrived, and retries refunds. Expired reservations are released by `pg_cron` every minute regardless.
7. Confirm the account's real fees, supported immediate payment methods, webhook delivery, test refund, and inventory behavior. Then set `MERCADO_PAGO_CHECKOUT_ENABLED=true`.

Server-side privileged credentials are used only to move a verified guest cart into an account and to process provider payments, refunds, and reconciliation. The browser never receives these credentials. Sales entered through `/admin/orders` require a human to check the actual payment before submitting the form.

## Concurrency model

- **Cart**: one server cart per identity (guests get an anonymous Supabase identity). `add`/`remove` are set operations under the cart row lock, so devices editing at once never lose changes. Adding never reserves.
- **Reservation**: `prepare_checkout` locks the buyer cart, then the items (`FOR NO KEY UPDATE`, id order). The first transaction to reserve the last unit wins; the other receives `Item reserved`. Reservations last 15 minutes.
- **Idempotency**: the same key, or the same cart and delivery from another tab, returns the existing live order. A changed cart supersedes the buyer's previous unpaid order unless a payment is in flight.
- **Payment**: `settle_payment` locks the order, then the items; duplicate webhooks are no-ops, stock is decremented once, and approvals that arrive after another buyer took the unit are refunded.
- **Sync**: the database bumps `shopping_carts.revision` (owner changes) or `cart_signals.version` (someone else reserved, bought or released an item). Supabase Realtime pushes those rows to the owner's devices; the client re-reads the snapshot and ignores stale revisions.
