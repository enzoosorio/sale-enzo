import { OrderStatusPage } from '@/components/cart/OrderStatusPage';
export const metadata = { title: 'Estado del pedido | Sale Enzo' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  return <OrderStatusPage id={id} token={typeof t === 'string' ? t : undefined} />;
}
