import { z } from 'zod';

/**
 * Base schema for Variant Color Category (variant_color_categories table)
 * Represents color clusters using LAB color space centroids
 */
export const variantColorCategorySchema = z.strictObject({
  id: z.uuid(),
  centroid_l: z.number().min(0).max(100), // L: 0-100
  centroid_a: z.number().min(-128).max(127), // a: green to red
  centroid_b: z.number().min(-128).max(127), // b: blue to yellow
  representative_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for inserting a variant color category
 * Omits auto-generated fields: id, created_at, updated_at
 */
export const variantColorCategoryInsertSchema = z.strictObject({
  centroid_l: z.number()
    .min(0, "L value must be between 0 and 100")
    .max(100),
  centroid_a: z.number()
    .min(-128, "a value must be between -128 and 127")
    .max(127),
  centroid_b: z.number()
    .min(-128, "b value must be between -128 and 127")
    .max(127),
  representative_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

/**
 * Schema for updating a variant color category
 * All fields are optional
 */
export const variantColorCategoryUpdateSchema = z.strictObject({
  centroid_l: z.number().min(0).max(100).optional(),
  centroid_a: z.number().min(-128).max(127).optional(),
  centroid_b: z.number().min(-128).max(127).optional(),
  representative_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

// Type exports
export type VariantColorCategory = z.infer<typeof variantColorCategorySchema>;
export type VariantColorCategoryInsert = z.infer<typeof variantColorCategoryInsertSchema>;
export type VariantColorCategoryUpdate = z.infer<typeof variantColorCategoryUpdateSchema>;
