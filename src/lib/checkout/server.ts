import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import type { CartSnapshot } from './schemas';

export const emptyCart: CartSnapshot = { cart_id: null, revision: 0, items: [] };

export function serviceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured');
  // Privileged access is restricted to verified payment, cart merge and admin operations.
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getCart(): Promise<CartSnapshot> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return emptyCart;
  const { data, error } = await client.rpc('cart_snapshot');
  if (error) throw error;
  return (data as CartSnapshot | null) ?? emptyCart;
}

export const paymentEnabled = () =>
  process.env.MERCADO_PAGO_CHECKOUT_ENABLED === 'true' && !!process.env.MERCADO_PAGO_ACCESS_TOKEN &&
  !!process.env.MERCADO_PAGO_WEBHOOK_SECRET && !!process.env.MERCADO_PAGO_COLLECTOR_ID &&
  !!process.env.SITE_URL?.startsWith('https://');
