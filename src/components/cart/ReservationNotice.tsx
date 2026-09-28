'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CartSnapshot } from '@/lib/checkout/schemas';

export function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Live countdown of the buyer's own reservation, shared by cart and checkout. */
export function ReservationNotice({ pending }: { pending: CartSnapshot['pending_order'] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  if (!pending) return null;
  const remaining = new Date(pending.expires_at).getTime() - now;
  if (remaining <= 0) return null;
  return <p role="status" className="text-sm border border-black/20 bg-white px-4 py-3 mb-6">
    Tus prendas están reservadas por <strong className="tabular-nums">{formatRemaining(remaining)}</strong>.{' '}
    <Link className="underline" href={`/orders/${pending.id}?t=${pending.access_token}`}>Ver pedido</Link>
  </p>;
}
