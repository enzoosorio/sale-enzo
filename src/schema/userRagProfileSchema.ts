import { z } from 'zod';

/**
 * Base schema for User RAG Profile (user_rag_profiles table)
 * Stores semantic embeddings and summaries for user personalization
 */
export const userRagProfileSchema = z.strictObject({
  user_id: z.uuid(),
  summary_text: z.string().min(1),
  embedding: z.any().nullable(), // Vector type - handled by Supabase
  version: z.number().int().nonnegative(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for inserting user RAG profile
 * Omits auto-generated field: updated_at
 */
export const userRagProfileInsertSchema = z.strictObject({
  user_id: z.uuid(),
  summary_text: z.string().min(1, "Summary text is required"),
  embedding: z.any().optional(), // Vector embedding
  version: z.number().int().nonnegative().default(1),
});

/**
 * Schema for updating user RAG profile
 * All fields except user_id are optional
 */
export const userRagProfileUpdateSchema = z.strictObject({
  summary_text: z.string().min(1).optional(),
  embedding: z.any().optional(),
  version: z.number().int().nonnegative().optional(),
});

// Type exports
export type UserRagProfile = z.infer<typeof userRagProfileSchema>;
export type UserRagProfileInsert = z.infer<typeof userRagProfileInsertSchema>;
export type UserRagProfileUpdate = z.infer<typeof userRagProfileUpdateSchema>;
