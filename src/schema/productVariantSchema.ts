import { z } from 'zod';

/**
 * Enum for product gender
 */
export const genderEnum = z.enum(['male', 'female', 'unisex', 'kids']);

/**
 * Enum for product fit
 */
export const fitEnum = z.enum(['slim', 'regular', 'loose', 'oversized']);

/**
 * Base schema for Product Variant (product_variants table)
 * Represents a visual/structural variant of a product
 */
export const productVariantSchema = z.strictObject({
  id: z.uuid(),
  product_id: z.uuid(),
  size: z.string().nullable(),
  main_color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  main_color_category_id: z.uuid().nullable(),
  main_img_url: z.string().url(),
  gender: z.string().nullable(),
  fit: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a product variant
 * Omits auto-generated fields: id, created_at
 */
export const productVariantInsertSchema = z.strictObject({
  product_id: z.uuid(),
  size: z.string().max(10).optional(),
  main_color_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  main_color_category_id: z.uuid().optional(),
  main_img_url: z.string().url("Invalid image URL"),
  gender: genderEnum.optional(),
  fit: fitEnum.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for updating a product variant
 * All fields except product_id are optional
 */
export const productVariantUpdateSchema = z.strictObject({
  size: z.string().max(10).optional(),
  main_color_hex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
  main_color_category_id: z.uuid().optional(),
  main_img_url: z.string().url().optional(),
  gender: genderEnum.optional(),
  fit: fitEnum.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Type exports
export type Gender = z.infer<typeof genderEnum>;
export type Fit = z.infer<typeof fitEnum>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductVariantInsert = z.infer<typeof productVariantInsertSchema>;
export type ProductVariantUpdate = z.infer<typeof productVariantUpdateSchema>;
