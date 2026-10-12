'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/images/media';
import { whatsappUrl } from '@/lib/checkout/whatsapp';
import { clearCheckoutKey } from './checkoutKey';

type Order = {
  id: string; status: string; payment_status: string; total: number; subtotal: number; delivery_fee: number;
  delivery_label: string; reservation_expires_at: string; order_items: { title_snapshot: string; size_snapshot: string | null; price: number }[];
};

const isFinal = (order: Order) => ['completed', 'refunded'].includes(order.payment_status) || ['cancelled', 'superseded', 'delivered'].includes(order.status);

function heading(order: Order | null) {
  if (!order) return 'Consultando tu pedido';
  if (order.payment_status === 'completed') return 'Pago confirmado';
  if (order.payment_status === 'refunded') return 'Pago devuelto';
  if (order.payment_status === 'review') return 'Estamos revisando tu pago';
  if (order.payment_status === 'failed' || order.status === 'cancelled' || order.status === 'superseded') return 'No se completó el pago';
  return 'Estamos verificando el pago';
}

export function OrderStatusPage({ id, token }: { id: string; token?: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = `/api/orders/${encodeURIComponent(id)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
    const refresh = async () => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('No pudimos encontrar este pedido. Usa el enlace completo que recibiste al pagar.');
        const data = await response.json() as Order;
        if (!active) return;
        setOrder(data); setError('');
        // The return URL is display-only: the webhook decides. Poll until the order is final.
        if (isFinal(data)) clearCheckoutKey();
        else timer = setTimeout(refresh, 5000);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Error'); }
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [id, token]);
  const chat = whatsappUrl(`Hola, quisiera consultar el pedido Sale Enzo ${id}. Entiendo que el chat no confirma el pago.`);
  const retry = !!order && !['completed', 'refunded', 'review'].includes(order.payment_status) &&
    (order.payment_status === 'failed' || order.status === 'cancelled' || order.status === 'superseded');
  return <main className="min-h-screen bg-off-white px-5 py-16 md:px-16 font-inria"><div className="mx-auto max-w-2xl">
    <p className="text-xs uppercase tracking-[0.25em] mb-4">Sale Enzo / Pedido</p>
    <h1 className="font-prata text-3xl md:text-5xl mb-5" aria-live="polite">{heading(order)}</h1>
    {error && <p role="alert" className="text-red-700 mb-6">{error}</p>}
    {order && <><p className="mb-2">Referencia: <span className="font-mono text-sm break-all">{order.id}</span></p>
      {!isFinal(order) && <p className="text-sm text-black/60 mb-8">Reserva hasta {new Date(order.reservation_expires_at).toLocaleString('es-PE')}. Esta página se actualizará automáticamente.</p>}
      {order.payment_status === 'refunded' && <p className="text-sm text-black/60 mb-8">Otra persona completó la compra antes que tú. Devolvimos el importe a tu medio de pago.</p>}
      <div className="border-t border-black/20 py-6"><ul className="space-y-2">{order.order_items.map((item, index) => <li key={index} className="flex justify-between gap-4"><span>{item.title_snapshot}{item.size_snapshot ? ` · ${item.size_snapshot}` : ''}</span><span>{formatPrice(Number(item.price))}</span></li>)}</ul></div>
      <div className="flex justify-between border-t border-black py-5 text-lg"><strong>Total</strong><strong>{formatPrice(Number(order.total))}</strong></div>
      {retry && chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="inline-block bg-black text-white px-6 py-3 mt-4 focus-visible:outline-2 focus-visible:outline-offset-2">Pedir por WhatsApp</a>}
    </>}
    <div className="flex gap-5 mt-8">{chat && !retry && <a href={chat} target="_blank" rel="noopener noreferrer" className="underline">Consultar por WhatsApp</a>}<Link href="/home" className="underline">Seguir explorando</Link></div>
  </div></main>;
}
