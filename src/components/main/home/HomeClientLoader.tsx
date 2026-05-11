'use client';
import dynamic from 'next/dynamic';

// Loads HomeClient (GSAP + Lenis) lazily after first paint to avoid blocking LCP
const HomeClientDynamic = dynamic(
  () => import('./HomeClient').then((m) => m.HomeClient),
  { ssr: false },
);

export function HomeClientLoader() {
  return <HomeClientDynamic />;
}
