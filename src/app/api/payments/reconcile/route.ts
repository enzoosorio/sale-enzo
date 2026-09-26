import { timingSafeEqual } from 'node:crypto';
import { serviceClient } from '@/lib/checkout/server';
import { reconcilePayment } from '@/lib/checkout/settle';

export async function POST(request: Request) {
  const secret = process.env.CHECKOUT_CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!secret || !provided || Buffer.byteLength(secret) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(provided))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const service = serviceClient();
  const { data: attempts, error } = await service.from('payment_events').select('payment_id').in('status', ['pending', 'in_process', 'approved']).limit(100);
  if (error) return Response.json({ error: 'No se pudo consultar pagos' }, { status: 500 });
  let checked = 0;
  for (const attempt of attempts ?? []) {
    try { await reconcilePayment(attempt.payment_id); checked++; }
    catch (reason) { console.error('Reconcile attempt failed', reason); }
  }
  const { data: released, error: releaseError } = await service.rpc('release_expired_reservations');
  if (releaseError) return Response.json({ error: 'No se pudieron liberar reservas' }, { status: 500 });
  return Response.json({ checked, released });
}
