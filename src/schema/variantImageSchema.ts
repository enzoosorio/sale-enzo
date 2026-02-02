import { z } from 'zod';

/**
 * Image position types
 * - front, back, logo, detail: Only ONE image allowed per position
 * - random: MULTIPLE images allowed
 */
export const imagePositionSchema = z.enum(["front", "back", "logo", "detail", "random"]);

export type ImagePosition = z.infer<typeof imagePositionSchema>;

/**
 * Base schema for Variant Image (variant_images table)
 * Additional images for a product variant
 */
export const variantImageSchema = z.strictObject({
  id: z.string().uuid(),
  variant_id: z.string().uuid(),
  image_url: z.string().url(),
  position: imagePositionSchema.nullable(),
  created_at: z.string().datetime(),
});

/**
 * Schema for inserting a variant image
 * Omits auto-generated fields: id, created_at
 */
export const variantImageInsertSchema = z.strictObject({
  variant_id: z.string().uuid(),
  image_url: z.string()
    .url("Invalid image URL")
    .regex(/\.(jpg|jpeg|png|webp|avif)$/i, "Image must be jpg, png, webp, or avif"),
  position: imagePositionSchema
    .nullable()
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
  position: imagePositionSchema
    .nullable()
    .optional(),
});

// Type exports
export type VariantImage = z.infer<typeof variantImageSchema>;
export type VariantImageInsert = z.infer<typeof variantImageInsertSchema>;
export type VariantImageUpdate = z.infer<typeof variantImageUpdateSchema>;
