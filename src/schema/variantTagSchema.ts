import { z } from 'zod';

/**
 * Base schema for Variant Tag (variant_tags table)
 * Many-to-many relationship between variants and tags
 */
export const variantTagSchema = z.strictObject({
  variant_id: z.uuid(),
  tag_id: z.uuid(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a variant tag relationship
 * Omits auto-generated fields: created_at
 */
export const variantTagInsertSchema = z.strictObject({
  variant_id: z.uuid(),
  tag_id: z.uuid(),
});

/**
 * Variant tags are immutable - no updates allowed
 * To change tags, delete and recreate the relationship
 */
export const variantTagUpdateSchema = z.never();

// Type exports
export type VariantTag = z.infer<typeof variantTagSchema>;
export type VariantTagInsert = z.infer<typeof variantTagInsertSchema>;
export type VariantTagUpdate = z.infer<typeof variantTagUpdateSchema>;
