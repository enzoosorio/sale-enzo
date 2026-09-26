import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { isAdmin } from '@/lib/auth/isAdmin';

const input = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('sale'), itemId: z.uuid(), name: z.string().min(2), email: z.union([z.email(), z.literal('')]), phone: z.string().min(6), verified: z.literal(true) }),
  z.strictObject({ action: z.enum(['deliver', 'cancel']), orderId: z.uuid() }),
]);

export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const client = await createClient();
  const value = parsed.data;
  const result = value.action === 'sale'
    ? await client.rpc('admin_record_whatsapp_sale', { p_item: value.itemId, p_name: value.name, p_email: value.email, p_phone: value.phone, p_payment_verified: value.verified })
    : await client.rpc('admin_transition_order', { p_order: value.orderId, p_action: value.action });
  if (result.error) return Response.json({ error: result.error.message }, { status: 409 });
  return Response.json({ success: true, orderId: result.data });
}
