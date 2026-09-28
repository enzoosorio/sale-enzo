import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { checkoutErrorMessage, emptyCart, getCart } from '@/lib/checkout/server';
import { cartLineInput } from '@/lib/checkout/schemas';
import { GUEST_CART_COOKIE, guestCookieOptions, signGuestId } from '@/lib/checkout/guestCookie';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  try { return Response.json(await getCart(), { headers: noStore }); }
  catch { return Response.json({ error: 'No se pudo cargar el carrito' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const parsed = cartLineInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const client = await createClient();
  let { data: { user } } = await client.auth.getUser();
  if (!user && parsed.data.action === 'add') {
    // Guests get a real (anonymous) Supabase identity, so RLS, locks and idempotency work exactly as for accounts.
    const signed = await client.auth.signInAnonymously();
    if (signed.error || !signed.data.user) return Response.json({ error: 'No se pudo iniciar el carrito' }, { status: 503 });
    user = signed.data.user;
    const cookie = await signGuestId(user.id);
    if (cookie) (await cookies()).set(GUEST_CART_COOKIE, cookie, guestCookieOptions);
    else console.warn('CART_MERGE_SECRET is not set: guest carts will not move to the account on sign-in');
  }
  if (!user) return Response.json({ error: 'Sin carrito' }, { status: 401 });
  const { error } = await client.rpc('cart_change', { p_item_id: parsed.data.itemId, p_action: parsed.data.action });
  if (error) return Response.json({ error: checkoutErrorMessage(error.message, 'No se pudo actualizar el carrito') }, { status: 409 });
  const snapshot = await client.rpc('cart_snapshot');
  if (snapshot.error) return Response.json({ error: 'No se pudo leer el carrito' }, { status: 500 });
  return Response.json(snapshot.data ?? emptyCart, { headers: noStore });
}
