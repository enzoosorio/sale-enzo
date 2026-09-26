import type { CartSnapshot } from './schemas';

export function whatsappUrl(message: string) {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}

export function cartWhatsAppMessage(items: CartSnapshot['items'], orderId?: string) {
  const lines = items.map(item => `• ${item.title}${item.size ? ` (${item.size})` : ''} — S/ ${Number(item.price).toFixed(2)}`);
  return [`Hola, quisiera consultar por estas prendas de Sale Enzo:`, ...lines, orderId ? `Referencia: ${orderId}` : '', 'Entiendo que el chat no reserva las prendas.'].filter(Boolean).join('\n');
}
