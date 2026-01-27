import { z } from 'zod';

/**
 * Enum for product condition
 */
export const productConditionEnum = z.enum([
  'new',
  'like_new',
  'semi-used',
  'used',
  'worn'
]);

/**
 * Enum for product item status
 */
export const productItemStatusEnum = z.enum([
  'active',
  'hidden',
  'sold'
]);

/**
 * Base schema for Product Item (product_items table)
 * Represents a concrete sellable unit
 */
export const productItemSchema = z.strictObject({
  id: z.uuid(),
  variant_id: z.uuid(),
  condition: z.string(),
  price: z.number().positive(),
  sku: z.string().nullable(),
  stock: z.number().int().nonnegative(),
  seller_id: z.uuid().nullable(),
  status: z.string(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a product item
 * Omits auto-generated fields: id, created_at
 */
export const productItemInsertSchema = z.strictObject({
  variant_id: z.uuid(),
  condition: productConditionEnum,
  price: z.number()
    .positive("Price must be greater than 0")
    .max(1000000, "Price exceeds maximum allowed"),
  sku: z.string()
    .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers, and hyphens")
    .optional(),
  stock: z.number()
    .int()
    .nonnegative("Stock cannot be negative")
    .default(0),
  seller_id: z.uuid().optional(),
  status: productItemStatusEnum.default('active'),
});

/**
 * Schema for updating a product item
 * All fields are optional
 */
export const productItemUpdateSchema = z.strictObject({
  condition: productConditionEnum.optional(),
  price: z.number()
    .positive()
    .max(1000000)
    .optional(),
  sku: z.string()
    .regex(/^[A-Z0-9-]+$/)
    .optional(),
  stock: z.number()
    .int()
    .nonnegative()
    .optional(),
  seller_id: z.uuid().optional(),
  status: productItemStatusEnum.optional(),
});

// Type exports
export type ProductCondition = z.infer<typeof productConditionEnum>;
export type ProductItemStatus = z.infer<typeof productItemStatusEnum>;
export type ProductItem = z.infer<typeof productItemSchema>;
export type ProductItemInsert = z.infer<typeof productItemInsertSchema>;
export type ProductItemUpdate = z.infer<typeof productItemUpdateSchema>;
