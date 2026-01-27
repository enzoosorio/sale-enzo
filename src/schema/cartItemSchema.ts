import { z } from 'zod';

/**
 * Base schema for Cart Item (cart_items table)
 * Shopping cart line items
 */
export const cartItemSchema = z.strictObject({
  user_id: z.uuid(),
  variant_id: z.uuid(),
  quantity: z.number().int().positive(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a cart item
 * Omits auto-generated fields: created_at
 */
export const cartItemInsertSchema = z.strictObject({
  user_id: z.uuid(),
  variant_id: z.uuid(),
  quantity: z.number()
    .int()
    .positive("Quantity must be at least 1")
    .max(100, "Quantity exceeds maximum allowed per item"),
});

/**
 * Schema for updating a cart item
 * Only quantity can be updated
 */
export const cartItemUpdateSchema = z.strictObject({
  quantity: z.number()
    .int()
    .positive("Quantity must be at least 1")
    .max(100, "Quantity exceeds maximum allowed per item"),
});

// Type exports
export type CartItem = z.infer<typeof cartItemSchema>;
export type CartItemInsert = z.infer<typeof cartItemInsertSchema>;
export type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>;
