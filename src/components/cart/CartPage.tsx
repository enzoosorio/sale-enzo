'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './useCart';
import { cartWhatsAppMessage, whatsappUrl } from '@/lib/checkout/whatsapp';
import { formatPrice } from '@/lib/images/media';

export function CartPage() {
  const { cart, loading, change } = useCart();
  const [error, setError] = useState('');
  const total = cart.items.reduce((sum, item) => sum + Number(item.price), 0);
  const chat = whatsappUrl(cartWhatsAppMessage(cart.items));
  return <main className="min-h-screen bg-off-white px-5 py-12 md:px-16 font-inria text-foreground">
    <div className="mx-auto max-w-5xl"><p className="text-xs uppercase tracking-[0.25em] mb-4">Sale Enzo / Compra</p>
      <h1 className="font-prata text-3xl md:text-5xl mb-4">Tu carrito</h1>
      <p className="text-sm text-black/65 mb-10">Añadir una prenda no la reserva. Confirmaremos disponibilidad y precio al continuar al pago.</p>
      {loading ? <p role="status">Cargando carrito…</p> : cart.items.length === 0 ?
        <div className="border-t border-black/20 py-14"><p className="mb-6">Tu carrito está vacío.</p><Link className="underline" href="/home">Explorar prendas</Link></div> :
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <ul className="divide-y divide-black/15 border-t border-black/15">{cart.items.map(item => {
            const changed = Number(item.price) !== Number(item.price_at_add);
            return <li key={item.item_id} className="flex gap-5 py-6">
              <div className="relative h-32 w-24 shrink-0 bg-black/5">{item.image && <Image src={item.image} alt={item.title} fill sizes="96px" className="object-contain" />}</div>
              <div className="flex-1 space-y-2"><Link href={`/products/${item.product_id}`} className="font-prata underline-offset-4 hover:underline">{item.title}</Link>
                <p className="text-sm">{item.size ? `Talla ${item.size} · ` : ''}{item.condition ?? 'Segunda mano'}</p>
                <p>{formatPrice(Number(item.price))}</p>
                {!item.available && <p className="text-sm text-red-700" role="alert">Ya no está disponible.</p>}
                {changed && <p className="text-sm text-amber-800" role="alert">El precio cambió desde que la añadiste: antes {formatPrice(Number(item.price_at_add))}.</p>}
                <button type="button" className="text-sm underline focus-visible:outline-2" onClick={async () => { try { await change(item.item_id, 'remove'); } catch { setError('No se pudo quitar la prenda'); } }}>Quitar</button>
              </div>
            </li>;
          })}</ul>
          <aside className="border-t border-black pt-6 h-fit"><h2 className="font-prata text-xl mb-6">Resumen</h2>
            <div className="flex justify-between mb-2"><span>Prendas</span><span>{cart.items.length}</span></div>
            <div className="flex justify-between border-t border-black/20 pt-4 mb-2"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
            <p className="text-sm text-black/60 mb-6">La entrega se calcula en checkout.</p>
            {cart.items.some(item => !item.available || Number(item.price) !== Number(item.price_at_add))
              ? <span className="block text-center bg-black/40 text-white px-5 py-3" aria-disabled="true">Continuar</span>
              : <Link href="/checkout" className="block text-center bg-black text-white px-5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2">Continuar</Link>}
            {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="block text-center border border-black px-5 py-3 mt-3">Consultar por WhatsApp</a>}
          </aside>
        </div>}
      {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
    </div>
  </main>;
}
