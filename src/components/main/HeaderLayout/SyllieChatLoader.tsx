'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SyllieChatDynamic = dynamic(
  () => import('./SyllieChat').then((m) => m.SyllieChat),
  { ssr: false, loading: () => null },
);

// Defers MorphSVGPlugin + CustomEase until the browser's idle period.
// requestIdleCallback fires when the main thread has no pending work,
// which means GSAP initialization never lands in the TBT window.
// Fallback timeout (2s) covers browsers without requestIdleCallback (Safari <16).
export function SyllieChatLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(id);
  }, []);

  return ready ? <SyllieChatDynamic /> : null;
}
