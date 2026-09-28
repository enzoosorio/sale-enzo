import { createClient } from '@/utils/supabase/server';
import { checkoutInput } from '@/lib/checkout/schemas';
import { checkoutErrorMessage, paymentEnabled, serviceClient } from '@/lib/checkout/server';
import { createPreference } from '@/lib/checkout/mercadoPago';

const CREATING_TIMEOUT_MS = 30_000;

export async function POST(request: Request) {
  if (!paymentEnabled()) return Response.json({ error: 'El pago en línea todavía no está habilitado' }, { status: 503 });
  const parsed = checkoutInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Revisa los datos de contacto y entrega', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Carrito no disponible' }, { status: 401 });

  // Price, availability, coverage and fee are recomputed and reserved atomically in the database.
  const { data: orderId, error: prepareError } = await client.rpc('prepare_checkout', {
    p_key: parsed.data.key, p_contact: parsed.data.contact, p_delivery: parsed.data.deliveryOptionId,
    p_address: parsed.data.address, p_expected_total: parsed.data.expectedTotal,
  });
  if (prepareError || !orderId) return Response.json({ error: checkoutErrorMessage(prepareError?.message, 'No se pudo preparar el pedido') }, { status: 409 });

  const service = serviceClient();
  const { data: order, error: orderError } = await service.from('orders')
    .select('id,contact_email,reservation_expires_at,delivery_fee,delivery_label,subtotal,status,payment_status,access_token').eq('id', orderId).single();
  if (orderError || !order) return Response.json({ error: 'No se pudo preparar el pedido' }, { status: 500 });
  const orderUrl = `/orders/${order.id}?t=${order.access_token}`;
  if (order.payment_status === 'completed' || order.payment_status === 'review') return Response.json({ orderId, orderUrl });
  if (order.status !== 'pending' || new Date(order.reservation_expires_at).getTime() <= Date.now())
    return Response.json({ error: 'La reserva venció; vuelve a intentarlo', orderId }, { status: 409 });

  // At most one preference in flight per order (partial unique index); retries after rejection create a new one.
  const { data: active } = await service.from('payment_attempts').select('id,checkout_url,status,updated_at')
    .eq('order_id', orderId).in('status', ['creating', 'ready']).maybeSingle();
  if (active?.status === 'ready' && active.checkout_url) return Response.json({ orderId, orderUrl, checkoutUrl: active.checkout_url });
  if (active) {
    if (Date.now() - new Date(active.updated_at).getTime() < CREATING_TIMEOUT_MS)
      return Response.json({ error: 'Estamos preparando el pago; intenta otra vez en unos segundos', orderId }, { status: 409 });
    await service.from('payment_attempts').update({ status: 'failed' }).eq('id', active.id).eq('updated_at', active.updated_at);
  }
  const { data: attempt, error: claimError } = await service.from('payment_attempts')
    .insert({ order_id: orderId, status: 'creating' }).select('id').single();
  if (claimError || !attempt) return Response.json({ error: 'Estamos preparando el pago; intenta otra vez', orderId }, { status: 409 });

  const { data: items } = await service.from('order_items').select('title_snapshot,price').eq('order_id', orderId);
  try {
    const preference = await createPreference({ ...order, attemptId: attempt.id, orderUrl, items: items ?? [] });
    const { error: saveError } = await service.from('payment_attempts')
      .update({ preference_id: preference.id, checkout_url: preference.init_point, status: 'ready', updated_at: new Date().toISOString() }).eq('id', attempt.id);
    if (saveError) throw saveError;
    return Response.json({ orderId, orderUrl, checkoutUrl: preference.init_point });
  } catch {
    await service.from('payment_attempts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', attempt.id);
    return Response.json({ error: 'Mercado Pago no respondió. Tu pedido sigue reservado; intenta otra vez.', orderId }, { status: 502 });
  }
}
