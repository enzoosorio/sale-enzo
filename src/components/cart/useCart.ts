'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { CartSnapshot } from '@/lib/checkout/schemas';

const empty: CartSnapshot = { cart_id: null, revision: 0, items: [] };
let channel: BroadcastChannel | null = null;

export function useCart() {
  const [cart, setCart] = useState<CartSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (response.ok) setCart(await response.json() as CartSnapshot);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    channel ??= new BroadcastChannel('sale-enzo-cart');
    channel.addEventListener('message', onFocus);
    return () => { window.removeEventListener('focus', onFocus); channel?.removeEventListener('message', onFocus); };
  }, [refresh]);
  useEffect(() => {
    if (!cart.cart_id) return;
    const client = createClient();
    const subscription = client.channel(`cart-${cart.cart_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shopping_carts', filter: `id=eq.${cart.cart_id}` }, () => { void refresh(); })
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    return () => { void client.removeChannel(subscription); };
  }, [cart.cart_id, refresh]);
  const change = useCallback(async (itemId: string, action: 'add' | 'remove') => {
    const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId, action }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar el carrito');
    setCart(data as CartSnapshot);
    const client = createClient();
    const { data: { session } } = await client.auth.getSession();
    if (session?.user.is_anonymous) sessionStorage.setItem('sale-enzo-guest-token', session.access_token);
    channel?.postMessage('changed');
    return data as CartSnapshot;
  }, []);
  return { cart, loading, refresh, change };
}
