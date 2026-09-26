import { OrderStatusPage } from '@/components/cart/OrderStatusPage';
export const metadata = { title: 'Estado del pedido | Sale Enzo' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderStatusPage id={id} />;
}
