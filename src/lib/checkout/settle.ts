import 'server-only';
import { getPayment, refundPayment } from './mercadoPago';
import { paymentMatchesOrder } from './paymentMatch';
import { serviceClient } from './server';

/**
 * Idempotent: settle_payment locks the order row, so duplicate or concurrent webhooks for the same
 * payment serialize and stock is decremented once. Refunds use a per-payment idempotency key.
 */
export async function reconcilePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  const service = serviceClient();
  const orderId = payment.external_reference;
  const { data: order, error } = await service.from('orders').select('id,total,currency').eq('id', orderId).maybeSingle();
  if (error || !order) throw new Error('Payment references an unknown order');
  const { count } = await service.from('payment_attempts').select('id', { count: 'exact', head: true }).eq('order_id', orderId);
  if (!count) throw new Error('Payment attempt mismatch');
  if (!paymentMatchesOrder(payment, order, Number(process.env.MERCADO_PAGO_COLLECTOR_ID)))
    throw new Error('Payment amount, currency or recipient mismatch');

  const id = String(payment.id);
  const { data: result, error: settleError } = await service.rpc('settle_payment', { p_order: orderId, p_payment: id, p_status: payment.status });
  if (settleError) throw settleError;
  const now = new Date().toISOString();
  if ((result === 'review' || result === 'duplicate_paid') && payment.status === 'approved') {
    // The units went to another buyer, or the order was already paid: return the money.
    await refundPayment(id);
    await service.from('payment_events').update({ status: 'refunded', updated_at: now }).eq('payment_id', id);
    if (result === 'review') {
      await service.from('payment_attempts').update({ status: 'refunded', updated_at: now }).eq('order_id', orderId).eq('status', 'refund_pending');
      await service.from('orders').update({ payment_status: 'refunded', status: 'cancelled' }).eq('id', orderId);
    }
  } else if (result === 'completed' && payment.status === 'approved') {
    await service.from('payment_events').update({ status: 'settled', updated_at: now }).eq('payment_id', id);
  }
  return { orderId, status: result as string };
}
