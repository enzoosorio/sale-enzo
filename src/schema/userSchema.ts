import { z } from 'zod';

/**
 * Base schema for User (users table)
 * Represents a complete user row from the database
 */
export const userSchema = z.strictObject({
  id: z.uuid(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  phone: z.string().min(10).max(20).nullable(),
  verified_email: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Schema for creating a new user (INSERT)
 * Omits auto-generated fields: id, created_at, updated_at
 */
export const userInsertSchema = z.strictObject({
  email: z.string().email("Invalid email format"),
  first_name: z.string().min(1, "First name is required").max(100).optional(),
  last_name: z.string().min(1, "Last name is required").max(100).optional(),
  avatar_url: z.string().url("Invalid URL format").optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional(),
  verified_email: z.boolean().default(false),
});

/**
 * Schema for updating a user (UPDATE)
 * All fields are optional
 */
export const userUpdateSchema = z.strictObject({
  email: z.string().email().optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional(),
  verified_email: z.boolean().optional(),
});

/**
 * Schema for user registration with password
 * Used in signup forms
 */
export const userRegistrationSchema = userInsertSchema.extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
