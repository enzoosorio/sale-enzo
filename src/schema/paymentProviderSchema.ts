import { z } from 'zod';

/**
 * Base schema for Payment Provider (payment_provider table)
 * Available payment methods/providers
 */
export const paymentProviderSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().nullable(),
});

/**
 * Schema for inserting a payment provider
 * Omits auto-generated fields: id
 */
export const paymentProviderInsertSchema = z.strictObject({
  name: z.string()
    .min(1, "Provider name is required")
    .max(100, "Provider name is too long")
    .optional(),
});

/**
 * Schema for updating a payment provider
 * Only name can be updated
 */
export const paymentProviderUpdateSchema = z.strictObject({
  name: z.string()
    .min(1)
    .max(100)
    .optional(),
});

// Type exports
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type PaymentProviderInsert = z.infer<typeof paymentProviderInsertSchema>;
export type PaymentProviderUpdate = z.infer<typeof paymentProviderUpdateSchema>;
