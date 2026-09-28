'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPrice } from '@/lib/images/media';

type Order = { id: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; total: number; status: string; payment_status: string | null; created_at: string; order_items: { title_snapshot: string | null; size_snapshot: string | null; product_item_id: string | null }[] };

export function AdminOrders({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (payload: object) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error'); }
    finally { setBusy(false); }
  };
  return <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-off-white font-inria"><h1 className="font-prata text-3xl mb-6">Pedidos</h1>
    <form className="border border-black/20 p-5 mb-8 max-w-3xl space-y-4" onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      void send({ action: 'sale', itemId: data.get('itemId'), name: data.get('name'), email: data.get('email'), phone: data.get('phone'), verified: data.get('verified') === 'on' });
    }}><h2 className="font-prata text-xl">Registrar venta por WhatsApp</h2>
      <p className="text-sm text-black/60">Registra la venta solo después de comprobar el ingreso real. La prenda se descuenta del mismo inventario.</p>
      <div className="grid sm:grid-cols-2 gap-3">{[['itemId','ID de la prenda'],['name','Nombre'],['email','Correo (opcional)'],['phone','Teléfono']].map(([name,label]) => <label key={name} className="text-sm">{label}<input name={name} required={name !== 'email'} className="block w-full border border-black/30 p-2 mt-1" /></label>)}</div>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="verified" required /> He comprobado el ingreso del pago</label>
      <button disabled={busy} className="bg-black text-white px-5 py-2 disabled:opacity-50">Registrar venta</button>
    </form>
    {error && <p role="alert" className="text-red-700 mb-5">{error}</p>}
    <div className="space-y-3">{initialOrders.map(order => <article key={order.id} className="bg-white border border-black/15 p-5 flex flex-wrap gap-5 justify-between">
      <div><p className="font-mono text-xs">{order.id}</p><h2 className="font-prata text-lg mt-2">{order.contact_name ?? 'Sin nombre'}</h2>
        <p className="text-sm">{order.order_items.map(item => item.title_snapshot).join(', ')}</p><p className="text-sm text-black/60">{order.contact_email} · {order.contact_phone}</p></div>
      <div className="text-right"><p>{formatPrice(Number(order.total))}</p><p className="text-sm">{order.status} / {order.payment_status}</p>
        <div className="flex gap-2 mt-3">{order.status === 'paid' && <button disabled={busy} onClick={() => void send({ action: 'deliver', orderId: order.id })} className="border border-black px-3 py-1 text-sm">Marcar entrega</button>}
          {order.payment_status !== 'completed' && order.status !== 'cancelled' && <button disabled={busy} onClick={() => void send({ action: 'cancel', orderId: order.id })} className="border border-black px-3 py-1 text-sm">Cancelar</button>}</div></div>
    </article>)}</div>
  </main>;
}
