import { z } from 'zod';

export const cartLineInput = z.strictObject({ itemId: z.uuid(), action: z.enum(['add', 'remove']) });
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

export type CartSnapshot = {
  cart_id: string | null;
  revision: number;
  items: Array<{
    item_id: string; product_id: string; title: string; size: string | null;
    condition: string | null; price: number; price_at_add: number; stock: number;
    status: string | null; image: string | null; available: boolean;
  }>;
};
