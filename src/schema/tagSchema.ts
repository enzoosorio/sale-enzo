import { z } from 'zod';

/**
 * Base schema for Tag (tags table)
 * Normalized tags for filtering and RAG
 */
export const tagSchema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a tag
 * Omits auto-generated fields: id, created_at
 */
export const tagInsertSchema = z.strictObject({
  name: z.string()
    .min(1, "Tag name is required")
    .max(50, "Tag name is too long"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
});

/**
 * Schema for updating a tag
 * All fields are optional
 */
export const tagUpdateSchema = z.strictObject({
  name: z.string()
    .min(1)
    .max(50)
    .optional(),
  slug: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

// Type exports
export type Tag = z.infer<typeof tagSchema>;
export type TagInsert = z.infer<typeof tagInsertSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
