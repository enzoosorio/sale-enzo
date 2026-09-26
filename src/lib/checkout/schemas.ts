import { z } from 'zod';

export const cartLineInput = z.strictObject({ itemId: z.uuid(), action: z.enum(['add', 'remove', 'accept_price']) });
export const checkoutInput = z.strictObject({
  key: z.uuid(),
  contact: z.strictObject({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    phone: z.string().trim().min(6).max(30),
  }),
  deliveryOptionId: z.uuid(),
  address: z.string().trim().max(300).default(''),
  expectedTotal: z.number().finite().nonnegative(),
});
export const orderTokenInput = z.string().regex(/^[0-9a-f]{64}$/);

export type CartItem = {
  item_id: string; product_id: string; title: string; size: string | null;
  condition: string | null; price: number; price_at_add: number; stock: number;
  status: string | null; image: string | null; available: boolean;
};

export type CartSnapshot = {
  cart_id: string | null;
  revision: number;
  pending_order: { id: string; expires_at: string; access_token: string } | null;
  items: CartItem[];
};

export const priceChanged = (item: CartItem) => Number(item.price) !== Number(item.price_at_add);
export const cartBlocked = (cart: CartSnapshot) =>
  cart.items.length === 0 || cart.items.some(item => !item.available || priceChanged(item));
export const cartSubtotal = (cart: CartSnapshot) =>
  Math.round(cart.items.reduce((sum, item) => sum + Number(item.price) * 100, 0)) / 100;
