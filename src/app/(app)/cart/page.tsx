import type { Metadata } from 'next';
import { CartPage } from '@/components/cart/CartPage';
import { NO_INDEX } from '@/lib/seo/site';
export const metadata: Metadata = { title: 'Carrito', robots: NO_INDEX };
export default function Page() { return <CartPage />; }
