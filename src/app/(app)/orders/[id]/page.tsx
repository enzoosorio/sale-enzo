import type { Metadata } from 'next';
import { OrderStatusPage } from '@/components/cart/OrderStatusPage';
import { NO_INDEX } from '@/lib/seo/site';
export const metadata: Metadata = { title: 'Estado del pedido', robots: NO_INDEX };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  return <OrderStatusPage id={id} token={typeof t === 'string' ? t : undefined} />;
}
