import { z } from 'zod';

/**
 * Base schema for Favorite (favorites table)
 * User's favorited product variants
 */
export const favoriteSchema = z.strictObject({
  user_id: z.uuid(),
  variant_id: z.uuid(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting a favorite
 * Omits auto-generated fields: created_at
 */
export const favoriteInsertSchema = z.strictObject({
  user_id: z.uuid(),
  variant_id: z.uuid(),
});

/**
 * Favorites are immutable - no updates allowed
 * To remove, delete the record
 */
export const favoriteUpdateSchema = z.never();

// Type exports
export type Favorite = z.infer<typeof favoriteSchema>;
export type FavoriteInsert = z.infer<typeof favoriteInsertSchema>;
export type FavoriteUpdate = z.infer<typeof favoriteUpdateSchema>;
