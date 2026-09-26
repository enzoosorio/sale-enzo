# Checkout setup

The purchase flow is deliberately disabled until Mercado Pago and delivery details have been verified. Do not set `MERCADO_PAGO_CHECKOUT_ENABLED=true` before completing these steps.

1. Apply `supabase/migrations/20260925000001_checkout.sql` locally with `supabase db reset --local` and verify the SQL checks. Never reset the linked project. Apply the versioned migration to the remote database only after local validation and backup.
2. Enable anonymous sign-ins in the hosted Supabase Auth settings. Local development uses `supabase/config.toml`. Anonymous identities have the `authenticated` database role, so review all authenticated policies before enabling hosted sign-ins.
3. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to the international number without a plus sign. Configure real pickup points and covered districts with fees in `/admin/delivery`. Only active options appear in checkout.
4. Set the server-only `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, and `MERCADO_PAGO_COLLECTOR_ID`. Set `SITE_URL` to the public HTTPS origin. Configure Mercado Pago payment webhooks at `${SITE_URL}/api/payments/mercado-pago/webhook` for the `payment` event. Test with seller and buyer test accounts. The return URL is display-only; it never marks an order paid.
5. Set `CHECKOUT_CRON_SECRET` and schedule an authenticated `POST /api/payments/reconcile` at least once per minute with `Authorization: Bearer <secret>`. This checks pending payment IDs, retries refunds, and releases expired reservations. The deployment scheduler must be configured in the chosen hosting service; this repository does not assume one.
6. Confirm the account's real fees, supported immediate payment methods, webhook delivery, test refund, and inventory behavior. Then set `MERCADO_PAGO_CHECKOUT_ENABLED=true`.

Server-side privileged credentials are used only to verify both cart owners during merge and to process provider payments, refunds, and reconciliation. The browser never receives these credentials. Sales entered through `/admin/orders` require a human to check the actual payment before submitting the form.
