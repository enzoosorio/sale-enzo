import { z } from 'zod';

/**
 * Base schema for Variant Image (variant_images table)
 * Additional images for a product variant
 */
export const variantImageSchema = z.strictObject({
  id: z.uuid(),
  variant_id: z.uuid(),
  image_url: z.string().url(),
  position: z.number().int().nonnegative().nullable(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a variant image
 * Omits auto-generated fields: id, created_at
 */
export const variantImageInsertSchema = z.strictObject({
  variant_id: z.uuid(),
  image_url: z.string()
    .url("Invalid image URL")
    .regex(/\.(jpg|jpeg|png|webp|avif)$/i, "Image must be jpg, png, webp, or avif"),
  position: z.number()
    .int()
    .nonnegative("Position must be a non-negative integer")
    .optional(),
});

/**
 * Schema for updating a variant image
 * All fields except variant_id are optional
 */
export const variantImageUpdateSchema = z.strictObject({
  image_url: z.string()
    .url()
    .regex(/\.(jpg|jpeg|png|webp|avif)$/i)
    .optional(),
  position: z.number()
    .int()
    .nonnegative()
    .optional(),
});

// Type exports
export type VariantImage = z.infer<typeof variantImageSchema>;
export type VariantImageInsert = z.infer<typeof variantImageInsertSchema>;
export type VariantImageUpdate = z.infer<typeof variantImageUpdateSchema>;
