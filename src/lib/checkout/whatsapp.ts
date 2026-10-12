import type { CartSnapshot } from './schemas';

const soles = (price: number) => `S/ ${Number(price).toFixed(2)}`;

/** wa.me only accepts digits: strips spaces, "+" and dashes. Returns null when no number is configured. */
export function whatsappUrl(message: string, number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) {
  const phone = (number ?? '').replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}

export function cartWhatsAppMessage(items: CartSnapshot['items'], orderId?: string) {
  if (items.length === 0) return 'Hola, quisiera consultar por prendas de Sale Enzo.';
  const lines = items.map(item => `• ${item.title}${item.size ? ` (${item.size})` : ''} — ${soles(item.price)}`);
  return [
    'Hola, quisiera comprar estas prendas de Sale Enzo:',
    ...lines,
    orderId ? `Referencia: ${orderId}` : '',
    '¿Siguen disponibles? Coordinemos la entrega por aquí.',
  ].filter(Boolean).join('\n');
}

export function productWhatsAppMessage({ title, size, price }: { title: string; size: string | null; price: number }) {
  return `Hola, me interesa ${title}${size ? `, talla ${size}` : ''} (${soles(price)}) de Sale Enzo. ¿Sigue disponible?`;
}
