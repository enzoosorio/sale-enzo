import { createClient } from '@supabase/supabase-js';

// Privileged access is restricted to verified payment, cart merge and reconciliation. Never import from client code.
export function serviceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Moves a verified guest's cart and orders to the signed-in account. Returns false when the cookie should be kept for a retry. */
export async function mergeGuestCart(guestId: string, ownerId: string) {
  if (guestId === ownerId) return true;
  const service = serviceClient();
  const { data, error } = await service.auth.admin.getUserById(guestId);
  if (error || !data.user?.is_anonymous) return true; // Not a guest (or gone): nothing to merge, drop the cookie.
  const { error: mergeError } = await service.rpc('cart_merge_verified', { p_guest: guestId, p_owner: ownerId });
  if (mergeError) { console.error('Guest cart merge failed', mergeError); return false; }
  return true;
}
