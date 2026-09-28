'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './useCart';
import { ReservationNotice } from './ReservationNotice';
import { cartWhatsAppMessage, whatsappUrl } from '@/lib/checkout/whatsapp';
import { cartBlocked, cartSubtotal, priceChanged } from '@/lib/checkout/schemas';
import { formatPrice } from '@/lib/images/media';
import type { CartAction } from '@/store/cartStore';

export function CartPage() {
  const { cart, loading, change } = useCart();
  const [error, setError] = useState('');
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const chat = whatsappUrl(cartWhatsAppMessage(cart.items));
  const run = async (itemId: string, action: CartAction, failure: string) => {
    setError(''); setBusyItem(itemId);
    try { await change(itemId, action); }
    catch (reason) { setError(reason instanceof Error ? reason.message : failure); }
    finally { setBusyItem(null); }
  };
  return <main className="min-h-screen bg-off-white px-5 py-12 md:px-16 font-inria text-foreground">
    <div className="mx-auto max-w-5xl"><p className="text-xs uppercase tracking-[0.25em] mb-4">Sale Enzo / Compra</p>
      <h1 className="font-prata text-3xl md:text-5xl mb-4">Tu carrito</h1>
      <p className="text-sm text-black/65 mb-6">Añadir una prenda no la reserva. Confirmaremos disponibilidad y precio al continuar al pago.</p>
      <ReservationNotice pending={cart.pending_order} />
      {loading ? <p role="status">Cargando carrito…</p> : cart.items.length === 0 ?
        <div className="border-t border-black/20 py-14"><p className="mb-6">Tu carrito está vacío.</p><Link className="underline" href="/home">Explorar prendas</Link></div> :
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <ul className="divide-y divide-black/15 border-t border-black/15">{cart.items.map(item => {
            const changed = priceChanged(item);
            const busy = busyItem === item.item_id;
            return <li key={item.item_id} className="flex gap-5 py-6">
              <div className="relative h-32 w-24 shrink-0 bg-black/5">{item.image && <Image src={item.image} alt={item.title} fill sizes="96px" className="object-contain" />}</div>
              <div className="flex-1 space-y-2"><Link href={`/products/${item.product_id}`} className="font-prata underline-offset-4 hover:underline">{item.title}</Link>
                <p className="text-sm">{item.size ? `Talla ${item.size} · ` : ''}{item.condition ?? 'Segunda mano'}</p>
                <p>{formatPrice(Number(item.price))}</p>
                {!item.available && <p className="text-sm text-red-700" role="alert">Ya no está disponible: otra persona la está pagando o ya se vendió.</p>}
                {changed && item.available && <div className="text-sm text-amber-800" role="alert">
                  <p>El precio cambió desde que la añadiste: antes {formatPrice(Number(item.price_at_add))}, ahora {formatPrice(Number(item.price))}.</p>
                  <button type="button" disabled={busy} className="underline mt-1 focus-visible:outline-2 disabled:opacity-50" onClick={() => run(item.item_id, 'accept_price', 'No se pudo actualizar el precio')}>Aceptar nuevo precio</button>
                </div>}
                <button type="button" disabled={busy} className="text-sm underline focus-visible:outline-2 disabled:opacity-50" onClick={() => run(item.item_id, 'remove', 'No se pudo quitar la prenda')}>Quitar</button>
              </div>
            </li>;
          })}</ul>
          <aside className="border-t border-black pt-6 h-fit"><h2 className="font-prata text-xl mb-6">Resumen</h2>
            <div className="flex justify-between mb-2"><span>Prendas</span><span>{cart.items.length}</span></div>
            <div className="flex justify-between border-t border-black/20 pt-4 mb-2"><span>Subtotal</span><strong>{formatPrice(cartSubtotal(cart))}</strong></div>
            <p className="text-sm text-black/60 mb-6">La entrega se calcula en checkout.</p>
            {cartBlocked(cart)
              ? <span className="block text-center bg-black/40 text-white px-5 py-3" aria-disabled="true">Continuar</span>
              : <Link href="/checkout" className="block text-center bg-black text-white px-5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2">Continuar</Link>}
            {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="block text-center border border-black px-5 py-3 mt-3">Consultar por WhatsApp</a>}
          </aside>
        </div>}
      {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
    </div>
  </main>;
}
