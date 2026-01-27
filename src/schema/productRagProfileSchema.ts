import { z } from 'zod';

/**
 * Base schema for Product RAG Profile (product_rag_profiles table)
 * Stores semantic embeddings for product items used in RAG
 */
export const productRagProfileSchema = z.strictObject({
  product_item_id: z.uuid(),
  content: z.string().min(1),
  embedding: z.any().nullable(), // Vector type - handled by Supabase
  version: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for inserting a product RAG profile
 * Omits auto-generated fields: created_at, updated_at
 */
export const productRagProfileInsertSchema = z.strictObject({
  product_item_id: z.uuid(),
  content: z.string()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content exceeds maximum length"),
  embedding: z.any().optional(), // Vector embedding
  version: z.number().int().nonnegative().default(1),
});

/**
 * Schema for updating a product RAG profile
 * All fields except product_item_id are optional
 */
export const productRagProfileUpdateSchema = z.strictObject({
  content: z.string()
    .min(10)
    .max(5000)
    .optional(),
  embedding: z.any().optional(),
  version: z.number().int().nonnegative().optional(),
});

// Type exports
export type ProductRagProfile = z.infer<typeof productRagProfileSchema>;
export type ProductRagProfileInsert = z.infer<typeof productRagProfileInsertSchema>;
export type ProductRagProfileUpdate = z.infer<typeof productRagProfileUpdateSchema>;
