'use client';
import dynamic from 'next/dynamic';

// MorphSVGPlugin + CustomEase are heavy GSAP club plugins (~40KB combined).
// SyllieChat is a non-critical UI widget (chat button) — it doesn't need to block
// the main thread on page load. Deferred until after React hydration completes.
const SyllieChatDynamic = dynamic(
  () => import('./SyllieChat').then((m) => m.SyllieChat),
  { ssr: false, loading: () => null },
);

export function SyllieChatLoader() {
  return <SyllieChatDynamic />;
}
