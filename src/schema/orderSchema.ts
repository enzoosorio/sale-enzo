import { z } from 'zod';

/**
 * Schema for address (used in shipping and billing)
 */
export const addressSchema = z.strictObject({
  street: z.string().min(1, "Street is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State/Province is required").max(100),
  postal_code: z.string()
    .min(3, "Postal code is required")
    .max(20)
    .regex(/^[A-Z0-9\s-]+$/i, "Invalid postal code format"),
  country: z.string()
    .min(2, "Country is required")
    .max(100),
  additional_info: z.string().max(500).optional(),
});

/**
 * Enum for order status
 */
export const orderStatusEnum = z.enum([
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]);

/**
 * Enum for payment status
 */
export const paymentStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded'
]);

/**
 * Base schema for Order (orders table)
 */
export const orderSchema = z.strictObject({
  id: z.uuid(),
  user_id: z.uuid().nullable(),
  shipping_address: z.record(z.string(), z.any()).nullable(), // JSONB
  billing_address: z.record(z.string(), z.any()).nullable(), // JSONB
  payment_provider_id: z.uuid().nullable(),
  payment_status: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  status: z.string(),
  total: z.number().nonnegative(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting an order
 * Omits auto-generated fields: id, created_at
 */
export const orderInsertSchema = z.strictObject({
  user_id: z.uuid().optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  payment_provider_id: z.uuid().optional(),
  payment_status: paymentStatusEnum.default('pending'),
  metadata: z.record(z.string(), z.any()).optional(),
  status: orderStatusEnum.default('pending'),
  total: z.number()
    .nonnegative("Total must be non-negative")
    .max(1000000, "Total exceeds maximum allowed"),
});

/**
 * Schema for updating an order
 * All fields are optional
 */
export const orderUpdateSchema = z.strictObject({
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  payment_provider_id: z.uuid().optional(),
  payment_status: paymentStatusEnum.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: orderStatusEnum.optional(),
  total: z.number()
    .nonnegative()
    .max(1000000)
    .optional(),
});

// Type exports
export type Address = z.infer<typeof addressSchema>;
export type OrderStatus = z.infer<typeof orderStatusEnum>;
// export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
// export type Order = z.infer<typeof orderSchema>;
// export type OrderInsert = z.infer<typeof orderInsertSchema>;
// export type OrderUpdate = z.infer<typeof orderUpdateSchema>;
// export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
// export type Order = z.infer<typeof orderSchema>;
// export type CreateOrder = z.infer<typeof createOrderSchema>;
// export type UpdateOrder = z.infer<typeof updateOrderSchema>;
