import { z } from 'zod';

/**
 * Base schema for Variant Color (variant_colors table)
 * Detected colors for a variant (multiple colors possible)
 * Uses LAB color space for perceptual uniformity
 */
export const variantColorSchema = z.strictObject({
  id: z.uuid(),
  variant_id: z.uuid(),
  color_category_id: z.uuid(),
  original_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  l: z.number().min(0).max(100), // L: lightness 0-100
  a: z.number().min(-128).max(127), // a: green to red
  b: z.number().min(-128).max(127), // b: blue to yellow
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a variant color
 * Omits auto-generated fields: id, created_at
 */
export const variantColorInsertSchema = z.strictObject({
  variant_id: z.uuid(),
  color_category_id: z.uuid(),
  original_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
  l: z.number()
    .min(0, "L value must be between 0 and 100")
    .max(100),
  a: z.number()
    .min(-128, "a value must be between -128 and 127")
    .max(127),
  b: z.number()
    .min(-128, "b value must be between -128 and 127")
    .max(127),
});

/**
 * Schema for updating a variant color
 * All fields except variant_id are optional
 */
export const variantColorUpdateSchema = z.strictObject({
  color_category_id: z.uuid().optional(),
  original_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  l: z.number().min(0).max(100).optional(),
  a: z.number().min(-128).max(127).optional(),
  b: z.number().min(-128).max(127).optional(),
});

// Type exports
export type VariantColor = z.infer<typeof variantColorSchema>;
export type VariantColorInsert = z.infer<typeof variantColorInsertSchema>;
export type VariantColorUpdate = z.infer<typeof variantColorUpdateSchema>;
