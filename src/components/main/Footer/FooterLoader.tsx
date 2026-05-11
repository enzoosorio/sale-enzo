'use client';
import dynamic from 'next/dynamic';

// Footer uses GSAP ScrollTrigger (background color transition on scroll).
// It's below the fold on every page — deferring it keeps ScrollTrigger out
// of the critical JS path and reduces TBT on initial load.
const FooterDynamic = dynamic(
  () => import('./Footer').then((m) => m.Footer),
  { ssr: false, loading: () => <footer className="footer h-20" /> },
);

export function FooterLoader() {
  return <FooterDynamic />;
}
