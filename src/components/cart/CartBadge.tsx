'use client';
import Link from 'next/link';
import { Bag } from '@/components/reusable/svgs/Bag';
import { useCart } from './useCart';

export function CartBadge({ mobile = false }: { mobile?: boolean }) {
  const { cart } = useCart();
  return <Link href="/cart" aria-label={`Carrito, ${cart.items.length} prendas`} className="relative inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-black">
    <Bag />{mobile && <span>Carrito</span>}
    {cart.items.length > 0 && <span className="min-w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center" aria-hidden="true">{cart.items.length}</span>}
  </Link>;
}
