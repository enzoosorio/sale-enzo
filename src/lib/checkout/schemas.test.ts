import { describe, expect, it } from 'vitest';
import { cartBlocked, cartLineInput, cartSubtotal, checkoutInput, type CartItem, type CartSnapshot } from './schemas';

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  item_id: crypto.randomUUID(), product_id: crypto.randomUUID(), title: 'Prenda', size: 'M', condition: null,
  price: 10.1, price_at_add: 10.1, stock: 1, status: 'available', image: null, available: true, ...overrides,
});
const cart = (items: CartItem[]): CartSnapshot => ({ cart_id: crypto.randomUUID(), revision: 1, pending_order: null, items });

describe('cart rules', () => {
  it('sums prices without floating point drift', () => {
    expect(cartSubtotal(cart([item(), item({ price: 20.2, price_at_add: 20.2 })]))).toBe(30.3);
  });
  it('blocks checkout for empty carts, unavailable items and unaccepted price changes', () => {
    expect(cartBlocked(cart([]))).toBe(true);
    expect(cartBlocked(cart([item({ available: false })]))).toBe(true);
    expect(cartBlocked(cart([item({ price: 12 })]))).toBe(true);
    expect(cartBlocked(cart([item()]))).toBe(false);
  });
  it('accepts only known cart actions on item ids', () => {
    expect(cartLineInput.safeParse({ itemId: crypto.randomUUID(), action: 'accept_price' }).success).toBe(true);
    expect(cartLineInput.safeParse({ itemId: crypto.randomUUID(), action: 'set_price' }).success).toBe(false);
    expect(cartLineInput.safeParse({ itemId: 'x', action: 'add' }).success).toBe(false);
    // Deterministic seed ids are not RFC 4122 but are valid database ids.
    expect(cartLineInput.safeParse({ itemId: '4c7c5cf1-9686-6c4e-64ea-9f1b5b126087', action: 'add' }).success).toBe(true);
  });
  it('never lets the client choose prices or extra fields at checkout', () => {
    const base = { key: crypto.randomUUID(), contact: { name: 'Ana', email: 'ana@test.pe', phone: '999999999' }, deliveryOptionId: crypto.randomUUID(), expectedTotal: 10 };
    expect(checkoutInput.safeParse(base).success).toBe(true);
    expect(checkoutInput.safeParse({ ...base, total: 0 }).success).toBe(false);
    expect(checkoutInput.safeParse({ ...base, expectedTotal: -1 }).success).toBe(false);
  });
});
