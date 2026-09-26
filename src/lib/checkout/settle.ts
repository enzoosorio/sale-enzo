import 'server-only';
import { getPayment, refundPayment } from './mercadoPago';
import { serviceClient } from './server';

export async function reconcilePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  const service = serviceClient();
  const orderId = payment.external_reference;
  const { data: order, error } = await service.from('orders').select('id,total,currency,status').eq('id', orderId).maybeSingle();
  if (error || !order) throw new Error('Payment references an unknown order');
  const { data: attempt } = await service.from('payment_attempts').select('id,payment_id').eq('order_id', orderId).maybeSingle();
  if (!attempt) throw new Error('Payment attempt mismatch');
  const collector = Number(process.env.MERCADO_PAGO_COLLECTOR_ID);
  const valid = payment.currency_id === order.currency && payment.collector_id === collector &&
    Math.round(payment.transaction_amount * 100) === Math.round(Number(order.total) * 100);
  if (!valid) throw new Error('Payment amount, currency or recipient mismatch');
  const { data: result, error: settleError } = await service.rpc('settle_payment', {
    p_order: orderId, p_payment: String(payment.id), p_status: payment.status,
  });
  if (settleError) throw settleError;
  if ((result === 'review' || result === 'duplicate_paid') && payment.status === 'approved') {
    await refundPayment(String(payment.id), orderId);
    await service.from('payment_events').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('payment_id', String(payment.id));
    if (result === 'review') {
      await service.from('payment_attempts').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('order_id', orderId);
      await service.from('orders').update({ payment_status: 'refunded', status: 'cancelled' }).eq('id', orderId);
    }
  } else if (result === 'completed' && payment.status === 'approved') {
    await service.from('payment_events').update({ status: 'settled', updated_at: new Date().toISOString() }).eq('payment_id', String(payment.id));
  }
  return { orderId, status: result as string };
}
