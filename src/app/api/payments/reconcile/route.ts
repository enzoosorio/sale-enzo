import { timingSafeEqual } from 'node:crypto';
import { serviceClient } from '@/lib/checkout/server';
import { reconcilePayment } from '@/lib/checkout/settle';
import { searchPaymentIds } from '@/lib/checkout/mercadoPago';

function authorized(request: Request) {
  const secret = process.env.CHECKOUT_CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '');
  return !!secret && !!provided && Buffer.byteLength(secret) === Buffer.byteLength(provided) &&
    timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const service = serviceClient();
  const paymentIds = new Set<string>();

  // 1. Known payments that are not final yet (includes approvals whose refund failed before).
  const { data: events, error } = await service.from('payment_events').select('payment_id')
    .in('status', ['pending', 'in_process', 'authorized', 'approved']).limit(100);
  if (error) return Response.json({ error: 'No se pudo consultar pagos' }, { status: 500 });
  events?.forEach(event => paymentIds.add(event.payment_id));

  // 2. Recent unpaid orders with a checkout attempt: find payments whose webhook never arrived.
  const since = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const { data: orders } = await service.from('orders').select('id,payment_attempts!inner(id)')
    .in('payment_status', ['pending', 'failed']).gte('created_at', since).limit(50);
  for (const order of orders ?? []) {
    try { (await searchPaymentIds(order.id)).forEach(id => paymentIds.add(id)); }
    catch (reason) { console.error('Payment search failed', reason); }
  }

  let checked = 0;
  for (const id of paymentIds) {
    try { await reconcilePayment(id); checked++; }
    catch (reason) { console.error('Reconcile attempt failed', reason); }
  }
  // pg_cron already releases every minute; this keeps the endpoint useful where pg_cron is unavailable.
  const { data: released, error: releaseError } = await service.rpc('release_expired_reservations');
  if (releaseError) return Response.json({ error: 'No se pudieron liberar reservas' }, { status: 500 });
  return Response.json({ checked, released });
}
