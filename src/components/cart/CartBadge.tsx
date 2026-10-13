'use client';
import Link from 'next/link';
import { Bag } from '@/components/reusable/svgs/Bag';
import { useCart } from './useCart';

export function CartCount() {
  const { cart } = useCart();
  if (cart.items.length === 0) return null;
  return <span className="min-w-5 h-5 px-1 rounded-full bg-black text-white text-xs inline-flex items-center justify-center" aria-hidden="true">{cart.items.length}</span>;
}

export function CartBadge({ className = '' }: { className?: string }) {
  const { cart } = useCart();
  return <Link href="/cart" aria-label={`Carrito, ${cart.items.length} prendas`} className={`relative inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-black ${className}`}>
    <Bag /><CartCount />
  </Link>;
}
