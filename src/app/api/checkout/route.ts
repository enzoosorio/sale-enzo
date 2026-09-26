import { createClient } from '@/utils/supabase/server';
import { checkoutInput } from '@/lib/checkout/schemas';
import { paymentEnabled, serviceClient } from '@/lib/checkout/server';
import { createPreference } from '@/lib/checkout/mercadoPago';

export async function POST(request: Request) {
  if (!paymentEnabled()) return Response.json({ error: 'El pago en línea todavía no está habilitado' }, { status: 503 });
  const parsed = checkoutInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Revisa los datos de contacto y entrega', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Carrito no disponible' }, { status: 401 });
  const { data: orderId, error: prepareError } = await client.rpc('prepare_checkout', {
    p_key: parsed.data.key, p_contact: parsed.data.contact, p_delivery: parsed.data.deliveryOptionId,
    p_address: parsed.data.address, p_expected_total: parsed.data.expectedTotal,
  });
  if (prepareError || !orderId) return Response.json({ error: prepareError?.message ?? 'No se pudo preparar el pedido' }, { status: 409 });
  const service = serviceClient();
  const { data: order, error: orderError } = await service.from('orders').select('id,contact_email,reservation_expires_at,delivery_fee,delivery_label,subtotal,status').eq('id', orderId).single();
  if (orderError || !order || order.status !== 'pending' || new Date(order.reservation_expires_at).getTime() <= Date.now())
    return Response.json({ error: 'La reserva venció; vuelve al carrito', orderId }, { status: 409 });
  const { data: existing } = await service.from('payment_attempts').select('checkout_url,status,updated_at').eq('order_id', orderId).maybeSingle();
  if (existing?.checkout_url) return Response.json({ orderId, checkoutUrl: existing.checkout_url });
  if (existing) {
    const stale = existing.status === 'creating' && Date.now() - new Date(existing.updated_at).getTime() > 30_000;
    if (existing.status !== 'failed' && !stale) return Response.json({ error: 'Estamos preparando el pago; intenta otra vez', orderId }, { status: 409 });
    let claim = service.from('payment_attempts').update({ status: 'creating', updated_at: new Date().toISOString() }).eq('order_id', orderId).eq('status', existing.status);
    if (stale) claim = claim.eq('updated_at', existing.updated_at);
    const { data: claimed } = await claim.select('id').maybeSingle();
    if (!claimed) return Response.json({ error: 'Estamos preparando el pago', orderId }, { status: 409 });
  } else {
    const { error } = await service.from('payment_attempts').insert({ order_id: orderId, status: 'creating' });
    if (error) return Response.json({ error: 'Estamos preparando el pago', orderId }, { status: 409 });
  }
  const { data: items } = await service.from('order_items').select('title_snapshot,price').eq('order_id', orderId);
  try {
    const preference = await createPreference({ ...order, items: items ?? [] });
    const { error: saveError } = await service.from('payment_attempts').update({ preference_id: preference.id, checkout_url: preference.init_point, status: 'ready', updated_at: new Date().toISOString() }).eq('order_id', orderId);
    if (saveError) throw saveError;
    return Response.json({ orderId, checkoutUrl: preference.init_point });
  } catch {
    await service.from('payment_attempts').update({ status: 'failed' }).eq('order_id', orderId);
    return Response.json({ error: 'Mercado Pago no respondió. Tu pedido sigue reservado; intenta otra vez.', orderId }, { status: 502 });
  }
}
