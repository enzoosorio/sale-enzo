import { createClient } from '@/utils/supabase/server';
import { emptyCart, getCart } from '@/lib/checkout/server';
import { cartLineInput } from '@/lib/checkout/schemas';

export async function GET() {
  try { return Response.json(await getCart(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'No se pudo cargar el carrito' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const parsed = cartLineInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const client = await createClient();
  let { data: { user } } = await client.auth.getUser();
  if (!user && parsed.data.action === 'add') {
    const signed = await client.auth.signInAnonymously();
    if (signed.error) return Response.json({ error: 'No se pudo iniciar el carrito' }, { status: 503 });
    user = signed.data.user;
  }
  if (!user) return Response.json({ error: 'Sin carrito' }, { status: 401 });
  const { error } = await client.rpc('cart_change', { p_item_id: parsed.data.itemId, p_action: parsed.data.action });
  if (error) return Response.json({ error: error.message }, { status: 409 });
  const snapshot = await client.rpc('cart_snapshot');
  if (snapshot.error) return Response.json({ error: 'No se pudo leer el carrito' }, { status: 500 });
  return Response.json(snapshot.data ?? emptyCart);
}
