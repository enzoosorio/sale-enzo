'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/images/media';
import { whatsappUrl } from '@/lib/checkout/whatsapp';

type Order = {
  id: string; status: string; payment_status: string; total: number; subtotal: number; delivery_fee: number;
  delivery_label: string; reservation_expires_at: string; order_items: { title_snapshot: string; size_snapshot: string | null; price: number }[];
};

export function OrderStatusPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo consultar el pedido en este navegador.');
        const data = await response.json() as Order;
        if (active) setOrder(data);
        if (data.payment_status === 'completed' || data.status === 'cancelled') sessionStorage.removeItem('sale-enzo-checkout-key');
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Error'); }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);
  const chat = whatsappUrl(`Hola, quisiera consultar el pedido Sale Enzo ${id}. Entiendo que el chat no confirma el pago.`);
  const heading = order?.payment_status === 'completed' ? 'Pago confirmado' : order?.payment_status === 'failed' || order?.status === 'cancelled' ? 'No se completó el pago' : 'Estamos verificando el pago';
  return <main className="min-h-screen bg-off-white px-5 py-16 md:px-16 font-inria"><div className="mx-auto max-w-2xl">
    <p className="text-xs uppercase tracking-[0.25em] mb-4">Sale Enzo / Pedido</p>
    <h1 className="font-prata text-3xl md:text-5xl mb-5">{heading}</h1>
    {error && <p role="alert" className="text-red-700 mb-6">{error}</p>}
    {order && <><p className="mb-2">Referencia: <span className="font-mono text-sm">{order.id}</span></p>
      {order.payment_status !== 'completed' && order.status !== 'cancelled' && <p className="text-sm text-black/60 mb-8">Reserva hasta {new Date(order.reservation_expires_at).toLocaleString('es-PE')}. Esta página se actualizará automáticamente.</p>}
      <div className="border-t border-black/20 py-6"><ul className="space-y-2">{order.order_items.map((item, index) => <li key={index} className="flex justify-between gap-4"><span>{item.title_snapshot}{item.size_snapshot ? ` · ${item.size_snapshot}` : ''}</span><span>{formatPrice(Number(item.price))}</span></li>)}</ul></div>
      <div className="flex justify-between border-t border-black py-5 text-lg"><strong>Total</strong><strong>{formatPrice(Number(order.total))}</strong></div>
      {order.payment_status === 'failed' && <Link href="/checkout" className="inline-block bg-black text-white px-6 py-3 mt-4">Reintentar compra</Link>}
    </>}
    <div className="flex gap-5 mt-8">{chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="underline">Consultar por WhatsApp</a>}<Link href="/home" className="underline">Seguir explorando</Link></div>
  </div></main>;
}
