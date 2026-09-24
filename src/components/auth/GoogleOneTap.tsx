'use client';

import Script from 'next/script';
import { createClient } from '@/utils/supabase/client';
import type { accounts, CredentialResponse } from 'google-one-tap';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

declare const google: { accounts: accounts };

export default function GoogleOneTap() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const generation = useRef(0);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!ready || !clientId || pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth')) return;
    let cancelled = false;
    const run = ++generation.current;
    async function initialize() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (data.session || cancelled) return;
      const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
      if (cancelled) return;
      const hashedNonce = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      google.accounts.id.initialize({
        client_id: clientId!,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response: CredentialResponse) => {
          if (cancelled || generation.current !== run) return;
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.credential, nonce });
          if (error) { console.error('No se pudo iniciar sesión con Google', error.message); return; }
          router.refresh();
        },
      });
      google.accounts.id.prompt();
    }
    void initialize().catch(error => {
      if (!cancelled) console.error('No se pudo inicializar Google One Tap', error);
    });
    return () => {
      cancelled = true;
      if (typeof google !== 'undefined') google.accounts.id.cancel();
    };
  }, [ready, clientId, pathname, router]);

  if (!clientId) return null;
  return <Script src="https://accounts.google.com/gsi/client" onReady={() => setReady(true)} strategy="lazyOnload" />;
}
