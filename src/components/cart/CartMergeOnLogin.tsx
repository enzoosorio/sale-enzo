'use client';
import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function CartMergeOnLogin() {
  useEffect(() => {
    const client = createClient();
    let running = false;
    const merge = async () => {
      if (running) return;
      const guestToken = sessionStorage.getItem('sale-enzo-guest-token');
      if (!guestToken) return;
      const { data: { user } } = await client.auth.getUser();
      if (!user || user.is_anonymous) return;
      running = true;
      try {
        const response = await fetch('/api/cart/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestToken }) });
        if (response.ok) {
          sessionStorage.removeItem('sale-enzo-guest-token');
          const notification = new BroadcastChannel('sale-enzo-cart');
          notification.postMessage('changed');
          notification.close();
        }
      } finally { running = false; }
    };
    void merge();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => { setTimeout(() => { void merge(); }, 0); });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
