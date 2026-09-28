'use client';
import { useState } from 'react';
import { useCart } from './useCart';
import { whatsappUrl } from '@/lib/checkout/whatsapp';

export function ProductPurchaseActions({ itemId, title, size, available }: { itemId: string; title: string; size: string | null; available: boolean }) {
  const { change } = useCart();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const chat = whatsappUrl(`Hola, quisiera consultar por ${title}${size ? `, talla ${size}` : ''}. Entiendo que el chat no reserva la prenda.`);
  return <div className="w-full space-y-3">
    <div className="flex flex-wrap gap-3 justify-end">
      <button type="button" disabled={!available || busy} onClick={async () => {
        setBusy(true);
        try { await change(itemId, 'add'); setMessage('Prenda añadida al carrito'); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo añadir'); }
        finally { setBusy(false); }
      }} className="px-6 py-3 bg-black text-white font-inria disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
        {busy ? 'Añadiendo…' : 'Añadir al carrito'}
      </button>
      {chat && <a href={chat} target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-black font-inria focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">Consultar por WhatsApp</a>}
    </div>
    <p role="status" aria-live="polite" className="text-sm text-right font-inria">{message}</p>
  </div>;
}
