import { z } from 'zod';

/**
 * Base schema for Order Item (order_items table)
 * Line items within an order
 */
export const orderItemSchema = z.strictObject({
  id: z.uuid(),
  order_id: z.uuid().nullable(),
  variant_id: z.uuid().nullable(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting an order item
 * Omits auto-generated fields: id, created_at
 */
export const orderItemInsertSchema = z.strictObject({
  order_id: z.uuid(),
  variant_id: z.uuid(),
  price: z.number()
    .nonnegative("Price must be non-negative")
    .max(1000000, "Price exceeds maximum allowed"),
  quantity: z.number()
    .int()
    .positive("Quantity must be at least 1")
    .max(1000, "Quantity exceeds maximum allowed"),
});

/**
 * Schema for updating an order item
 * All fields are optional
 */
export const orderItemUpdateSchema = z.strictObject({
  price: z.number()
    .nonnegative()
    .max(1000000)
    .optional(),
  quantity: z.number()
    .int()
    .positive()
    .max(1000)
    .optional(),
});

// Type exports
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderItemInsert = z.infer<typeof orderItemInsertSchema>;
export type OrderItemUpdate = z.infer<typeof orderItemUpdateSchema>;
