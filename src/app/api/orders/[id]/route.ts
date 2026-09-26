import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: Request, context: RouteContext<'/api/orders/[id]'>) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Pedido inválido' }, { status: 400 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: 'Sin sesión' }, { status: 401 });
  const { data, error } = await client.from('orders').select('id,status,payment_status,total,subtotal,delivery_fee,delivery_label,delivery_kind,contact_name,contact_email,contact_phone,reservation_expires_at,created_at,order_items(title_snapshot,size_snapshot,condition_snapshot,image_snapshot,price,quantity)').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error || !data) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
