import { z } from 'zod';

/**
 * Base schema for User Features (user_features table)
 * Stores behavioral signals, preferences, and persona data
 */
export const userFeaturesSchema = z.strictObject({
  user_id: z.uuid(),
  persona: z.record(z.string(), z.any()).nullable(),
  preferences: z.record(z.string(), z.any()).nullable(),
  affinities: z.record(z.string(), z.any()).nullable(),
  behavioral_signals: z.record(z.string(), z.any()).nullable(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for inserting user features
 * Omits auto-generated fields: updated_at
 */
export const userFeaturesInsertSchema = z.strictObject({
  user_id: z.uuid(),
  persona: z.record(z.string(), z.any()).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  affinities: z.record(z.string(), z.any()).optional(),
  behavioral_signals: z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for updating user features
 * All fields except user_id are optional
 */
export const userFeaturesUpdateSchema = z.strictObject({
  persona: z.record(z.string(), z.any()).optional(),
  preferences: z.record(z.string(), z.any()).optional(),
  affinities: z.record(z.string(), z.any()).optional(),
  behavioral_signals: z.record(z.string(), z.any()).optional(),
});

// Type exports
export type UserFeatures = z.infer<typeof userFeaturesSchema>;
export type UserFeaturesInsert = z.infer<typeof userFeaturesInsertSchema>;
export type UserFeaturesUpdate = z.infer<typeof userFeaturesUpdateSchema>;
