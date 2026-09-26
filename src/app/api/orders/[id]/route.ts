import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { orderTokenInput } from '@/lib/checkout/schemas';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request, context: RouteContext<'/api/orders/[id]'>) {
  const { id } = await context.params;
  if (!z.guid().safeParse(id).success) return Response.json({ error: 'Pedido inválido' }, { status: 400 });
  const client = await createClient();
  // Guests can open their order from any device with the unguessable link token.
  const token = new URL(request.url).searchParams.get('t');
  if (token) {
    if (!orderTokenInput.safeParse(token).success) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    const { data, error } = await client.rpc('order_by_token', { p_order: id, p_token: token });
    if (error || !data) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    return Response.json(data, { headers: noStore });
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Sin sesión' }, { status: 401 });
  const { data, error } = await client.from('orders').select('id,status,payment_status,total,subtotal,delivery_fee,delivery_label,delivery_kind,reservation_expires_at,created_at,order_items(title_snapshot,size_snapshot,condition_snapshot,image_snapshot,price,quantity)').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !data) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
  return Response.json(data, { headers: noStore });
}
