'use client';
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCartStore } from '@/store/cartStore';

/**
 * One sync engine per page, however many components read the cart (header badge, mobile menu,
 * cart page). Change signals come from three places and all trigger the same server re-read:
 *  - Supabase Realtime (WebSocket): shopping_carts for other devices of the same account, and
 *    cart_signals when another buyer reserves, buys or releases an item in this cart.
 *  - BroadcastChannel: other tabs of this browser, without a network round trip.
 *  - Window focus and auth changes: catch-up after sleep, sign-in merge or sign-out.
 */
let subscribers = 0;
let stop: (() => void) | null = null;

function startSync() {
  const client = createClient();
  const store = useCartStore;
  const tabs = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('sale-enzo-cart');
  const refresh = () => { void store.getState().refresh(); };
  let realtime: ReturnType<typeof client.channel> | null = null;
  let realtimeCart: string | null = null;

  const subscribe = async (cartId: string | null) => {
    if (cartId === realtimeCart) return;
    if (realtime) await client.removeChannel(realtime);
    realtime = null;
    realtimeCart = cartId;
    if (!cartId) return;
    // Realtime applies RLS with the socket's JWT; make sure it carries the (possibly anonymous) session.
    const { data: { session } } = await client.auth.getSession();
    if (session) client.realtime.setAuth(session.access_token);
    realtime = client.channel(`cart-${cartId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shopping_carts', filter: `id=eq.${cartId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cart_signals', filter: `cart_id=eq.${cartId}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
  };

  let lastRevision = store.getState().cart.revision;
  const unsubscribeStore = store.subscribe(state => {
    void subscribe(state.cart.cart_id);
    // Tell sibling tabs only about changes they have not seen yet.
    if (state.cart.revision !== lastRevision) {
      lastRevision = state.cart.revision;
      tabs?.postMessage(state.cart.revision);
    }
  });
  tabs?.addEventListener('message', (event: MessageEvent<number>) => {
    if (event.data !== store.getState().cart.revision) refresh();
  });
  window.addEventListener('focus', refresh);
  const { data: { subscription: auth } } = client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(refresh, 0);
  });
  refresh();

  return () => {
    unsubscribeStore();
    auth.unsubscribe();
    window.removeEventListener('focus', refresh);
    tabs?.close();
    if (realtime) void client.removeChannel(realtime);
  };
}

export function useCart() {
  useEffect(() => {
    if (subscribers++ === 0) stop = startSync();
    return () => {
      if (--subscribers === 0) { stop?.(); stop = null; }
    };
  }, []);
  const cart = useCartStore(state => state.cart);
  const loading = useCartStore(state => state.loading);
  const refresh = useCartStore(state => state.refresh);
  const change = useCartStore(state => state.change);
  return { cart, loading, refresh, change };
}
