import { z } from 'zod';

/**
 * Base schema for Product Category (product_categories table)
 * Represents hierarchical product categories
 */
export const productCategorySchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  parent_id: z.uuid().nullable(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a product category
 * Omits auto-generated fields: id, created_at
 */
export const productCategoryInsertSchema = z.strictObject({
  name: z.string()
    .min(1, "Category name is required")
    .max(100, "Category name is too long"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
  parent_id: z.uuid().optional(),
});

/**
 * Schema for updating a product category
 * All fields are optional
 */
export const productCategoryUpdateSchema = z.strictObject({
  name: z.string()
    .min(1)
    .max(100)
    .optional(),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
    .optional(),
  parent_id: z.uuid().optional(),
});

// Type exports
export type ProductCategory = z.infer<typeof productCategorySchema>;
export type ProductCategoryInsert = z.infer<typeof productCategoryInsertSchema>;
export type ProductCategoryUpdate = z.infer<typeof productCategoryUpdateSchema>;
