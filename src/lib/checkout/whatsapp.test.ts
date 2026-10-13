import { describe, expect, it } from 'vitest';
import { cartWhatsAppMessage, productWhatsAppMessage, whatsappUrl } from './whatsapp';
import type { CartItem } from './schemas';

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  item_id: crypto.randomUUID(), product_id: crypto.randomUUID(), title: 'Polo negro', size: 'M', condition: null,
  price: 35, price_at_add: 35, stock: 1, status: 'available', image: null, available: true, ...overrides,
});

describe('whatsapp links', () => {
  it('normalizes numbers written with spaces, dashes or +51', () => {
    expect(whatsappUrl('Hola', '+51 987 654 321')).toBe('https://wa.me/51987654321?text=Hola');
    expect(whatsappUrl('Hola', '51-987-654-321')).toBe('https://wa.me/51987654321?text=Hola');
  });
  it('returns null when no number is configured', () => {
    expect(whatsappUrl('Hola', '')).toBeNull();
    expect(whatsappUrl('Hola', '   ')).toBeNull();
    expect(whatsappUrl('Hola', undefined)).toBeNull();
  });
  it('encodes the message', () => {
    const text = 'Hola & chau\n¿ok?';
    expect(whatsappUrl(text, '51987654321')).toBe(`https://wa.me/51987654321?text=${encodeURIComponent(text)}`);
  });
});

describe('whatsapp messages', () => {
  it('falls back to a generic greeting for an empty cart', () => {
    expect(cartWhatsAppMessage([])).toBe('Hola, quisiera consultar por prendas de Sale Enzo.');
  });
  it('lists every cart item with size and price', () => {
    const message = cartWhatsAppMessage([item(), item({ title: 'Casaca', size: null, price: 120.5 })]);
    expect(message).toContain('• Polo negro (M) — S/ 35.00');
    expect(message).toContain('• Casaca — S/ 120.50');
  });
  it('builds a product message with title, size and price', () => {
    expect(productWhatsAppMessage({ title: 'Polo negro', size: 'M', price: 35 }))
      .toBe('Hola, me interesa Polo negro, talla M (S/ 35.00) de Sale Enzo. ¿Sigue disponible?');
    expect(productWhatsAppMessage({ title: 'Gorra', size: null, price: 20 }))
      .toBe('Hola, me interesa Gorra (S/ 20.00) de Sale Enzo. ¿Sigue disponible?');
  });
});
