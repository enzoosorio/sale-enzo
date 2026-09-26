'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './useCart';
import { formatPrice } from '@/lib/images/media';
import { cartWhatsAppMessage, whatsappUrl } from '@/lib/checkout/whatsapp';

type DeliveryOption = { id: string; kind: 'pickup' | 'delivery'; label: string; district: string | null; fee: number };

function checkoutKey(revision: number) {
  const saved = sessionStorage.getItem('sale-enzo-checkout-key');
  let current: { key: string; revision: number } | null = null;
  try { current = saved ? JSON.parse(saved) as { key: string; revision: number } : null; } catch { /* old key */ }
  const next = current?.revision === revision ? current : { key: crypto.randomUUID(), revision };
  sessionStorage.setItem('sale-enzo-checkout-key', JSON.stringify(next));
  return next.key;
}

export function CheckoutPage() {
  const { cart, loading } = useCart();
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void fetch('/api/delivery-options').then(r => r.json()).then(data => { if (Array.isArray(data)) setOptions(data); });
    void fetch('/api/checkout/status').then(r => r.json()).then(data => setEnabled(data.enabled === true));
  }, []);
  const option = options.find(item => item.id === selected);
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price), 0);
  const blocked = cart.items.length === 0 || cart.items.some(item => !item.available || Number(item.price) !== Number(item.price_at_add));
  const chat = whatsappUrl(cartWhatsAppMessage(cart.items));
  return <main className="min-h-screen bg-off-white px-5 py-12 md:px-16 font-inria text-foreground"><div className="mx-auto max-w-5xl">
    <p className="text-xs uppercase tracking-[0.25em] mb-4">Sale Enzo / Compra</p>
    <h1 className="font-prata text-3xl md:text-5xl mb-3">Finalizar compra</h1>
    <p className="text-sm text-black/65 mb-10">Compra como invitado. Reservaremos las prendas durante 15 minutos al continuar al pago.</p>
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <form id="checkout-form" className="space-y-10" onSubmit={async event => {
        event.preventDefault(); setError('');
        if (!option || blocked || loading) return;
        setBusy(true);
        const form = new FormData(event.currentTarget);
        try {
          const key = checkoutKey(cart.revision);
          const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key,
            contact: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') }, deliveryOptionId: option.id,
            address: form.get('address') ?? '', expectedTotal: Number((subtotal + Number(option.fee)).toFixed(2)) }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? 'No se pudo continuar');
          window.location.assign(data.checkoutUrl);
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error inesperado'); setBusy(false); }
      }}>
        <section><h2 className="font-prata text-xl border-b border-black/20 pb-4 mb-5">01 / Contacto</h2>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm">Nombre completo<input name="name" required minLength={2} autoComplete="name" className="block w-full mt-2 border border-black/30 bg-white p-3 focus-visible:outline-2" /></label>
            <label className="block text-sm">Correo<input name="email" type="email" required autoComplete="email" className="block w-full mt-2 border border-black/30 bg-white p-3 focus-visible:outline-2" /></label>
            <label className="block text-sm">Teléfono<input name="phone" type="tel" required minLength={6} autoComplete="tel" className="block w-full mt-2 border border-black/30 bg-white p-3 focus-visible:outline-2" /></label></div>
        </section>
        <section><h2 className="font-prata text-xl border-b border-black/20 pb-4 mb-5">02 / Entrega</h2>
          {options.length === 0 ? <p className="text-sm text-amber-800">Aún no hay zonas o puntos configurados. Puedes consultar por WhatsApp.</p> :
            <div className="space-y-3">{options.map(item => <label key={item.id} className="flex gap-3 items-start border border-black/20 p-4 cursor-pointer"><input type="radio" name="delivery" required value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} className="mt-1" /><span className="flex-1"><strong>{item.label}</strong><small className="block text-black/60">{item.kind === 'pickup' ? 'Encuentro; coordinaremos horario después' : item.district}</small></span><span>{formatPrice(Number(item.fee))}</span></label>)}
              {option?.kind === 'delivery' && <label className="block text-sm">Dirección de entrega<input name="address" required minLength={5} autoComplete="street-address" className="block w-full mt-2 border border-black/30 bg-white p-3 focus-visible:outline-2" /></label>}</div>}
        </section>
      </form>
      <aside className="border-t border-black pt-5 h-fit"><h2 className="font-prata text-xl mb-5">03 / Resumen</h2>
        {loading ? <p>Cargando…</p> : <ul className="space-y-2 mb-6">{cart.items.map(item => <li key={item.item_id} className="flex justify-between gap-3 text-sm"><span>{item.title}{item.size ? ` · ${item.size}` : ''}</span><span>{formatPrice(Number(item.price))}</span></li>)}</ul>}
        <div className="flex justify-between border-t border-black/20 pt-3"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        <div className="flex justify-between pt-2"><span>Entrega</span><span>{option ? formatPrice(Number(option.fee)) : 'Por elegir'}</span></div>
        <div className="flex justify-between border-t border-black mt-4 pt-4 text-lg"><strong>Total</strong><strong>{option ? formatPrice(subtotal + Number(option.fee)) : '—'}</strong></div>
        {blocked && <p className="text-sm text-red-700 mt-4" role="alert">Revisa el carrito: hay prendas no disponibles o con precio cambiado.</p>}
        {!enabled && <p className="text-sm text-amber-800 mt-4" role="status">El pago en línea aún no está habilitado.</p>}
        {error && <p className="text-sm text-red-700 mt-4" role="alert">{error}</p>}
        <button form="checkout-form" type="submit" disabled={!enabled || !option || blocked || busy} className="w-full bg-black text-white p-3 mt-6 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2">{busy ? 'Preparando pago…' : 'Continuar a Mercado Pago'}</button>
        {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="block text-center border border-black p-3 mt-3">Consultar por WhatsApp</a>}
        <Link href="/cart" className="block underline text-sm mt-5">Volver al carrito</Link>
      </aside>
    </div>
  </div></main>;
}
