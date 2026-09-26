import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { serviceClient } from '@/lib/checkout/server';

export async function POST(request: Request) {
  const parsed = z.strictObject({ guestToken: z.string().min(20) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const client = await createClient();
  const { data: { user: owner } } = await client.auth.getUser();
  if (!owner || owner.is_anonymous) return Response.json({ error: 'Inicia sesión' }, { status: 401 });
  const service = serviceClient();
  const { data: { user: guest }, error: guestError } = await service.auth.getUser(parsed.data.guestToken);
  if (guestError || !guest?.is_anonymous) return Response.json({ error: 'Carrito invitado inválido' }, { status: 403 });
  const { error } = await service.rpc('cart_merge_verified', { p_guest: guest.id, p_owner: owner.id });
  if (error) return Response.json({ error: 'No se pudo fusionar el carrito' }, { status: 500 });
  return Response.json({ success: true });
}
