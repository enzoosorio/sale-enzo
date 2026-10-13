import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NO_INDEX } from '@/lib/seo/site';

export const metadata: Metadata = { robots: NO_INDEX };

// Purchases are closed over WhatsApp from the cart; online checkout is retired.
export default function Page() { redirect('/cart'); }
