import { z } from 'zod';

/**
 * Enum for interaction types
 * Based on common e-commerce user actions
 */
export const interactionTypeEnum = z.enum([
  'view',
  'click',
  'add_to_cart',
  'remove_from_cart',
  'add_to_favorites',
  'remove_from_favorites',
  'search',
  'filter',
  'purchase',
  'share',
  'review',
]);

/**
 * Base schema for User Interaction (user_interactions table)
 * Tracks user behavioral events for recommendations
 */
export const userInteractionSchema = z.strictObject({
  id: z.uuid(),
  user_id: z.uuid().nullable(),
  product_id: z.uuid().nullable(),
  variant_id: z.uuid().nullable(),
  interaction_type: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  created_at: z.iso.datetime(),
});

/**
 * Schema for inserting user interaction
 * Omits auto-generated fields: id, created_at
 */
export const userInteractionInsertSchema = z.strictObject({
  user_id: z.uuid().optional(),
  product_id: z.uuid().optional(),
  variant_id: z.uuid().optional(),
  interaction_type: interactionTypeEnum,
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * User interactions are immutable - no updates allowed
 */
export const userInteractionUpdateSchema = z.never();

// Type exports
export type InteractionType = z.infer<typeof interactionTypeEnum>;
export type UserInteraction = z.infer<typeof userInteractionSchema>;
export type UserInteractionInsert = z.infer<typeof userInteractionInsertSchema>;
export type UserInteractionUpdate = z.infer<typeof userInteractionUpdateSchema>;
