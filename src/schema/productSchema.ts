import { z } from 'zod';

/**
 * Base schema for Product (products table)
 * Represents an abstract product - not directly sellable
 */
export const productSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  brand: z.string().nullable(),
  category_id: z.uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for inserting a product
 * Omits auto-generated fields: id, created_at, updated_at
 */
export const productInsertSchema = z.strictObject({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(2000).optional(),
  brand: z.string().min(1, "Brand is required").max(100).optional(),
  category_id: z.uuid().optional(),
  is_active: z.boolean().default(true),
});

/**
 * Schema for updating a product
 * All fields are optional
 */
export const productUpdateSchema = z.strictObject({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  brand: z.string().min(1).max(100).optional(),
  category_id: z.uuid().optional(),
  is_active: z.boolean().optional(),
});

// Type exports
export type Product = z.infer<typeof productSchema>;
export type ProductInsert = z.infer<typeof productInsertSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
