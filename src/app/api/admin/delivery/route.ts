import { z } from 'zod';
import { isAdmin } from '@/lib/auth/isAdmin';
import { createClient } from '@/utils/supabase/server';

const input = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('create'), kind: z.enum(['pickup','delivery']), label: z.string().trim().min(2).max(120), district: z.string().trim().max(120), fee: z.number().nonnegative().finite(), active: z.boolean() }),
  z.strictObject({ action: z.literal('set_active'), id: z.uuid(), active: z.boolean() }),
]);

export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const client = await createClient();
  const value = parsed.data;
  if (value.action === 'create' && value.kind === 'delivery' && !value.district)
    return Response.json({ error: 'El distrito es obligatorio' }, { status: 400 });
  const result = value.action === 'create'
    ? await client.from('delivery_options').insert({ kind: value.kind, label: value.label, district: value.kind === 'delivery' ? value.district : null, fee: value.fee, active: value.active })
    : await client.from('delivery_options').update({ active: value.active }).eq('id', value.id);
  return result.error ? Response.json({ error: result.error.message }, { status: 409 }) : Response.json({ success: true });
}
