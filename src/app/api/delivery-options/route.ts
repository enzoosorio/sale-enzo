import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const client = await createClient();
  const { data, error } = await client.from('delivery_options').select('id,kind,label,district,fee').eq('active', true).order('label');
  return error ? Response.json({ error: 'No se pudo cargar la entrega' }, { status: 500 }) : Response.json(data ?? []);
}
