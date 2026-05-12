'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const FooterDynamic = dynamic(
  () => import('./Footer').then((m) => m.Footer),
  { ssr: false, loading: () => <footer className="footer h-20" /> },
);

// ScrollTrigger loads on idle — Footer is below the fold and not time-critical.
export function FooterLoader() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(id);
  }, []);

  return ready ? <FooterDynamic /> : <footer className="footer h-20" />;
}
