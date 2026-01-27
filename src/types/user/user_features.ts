import { Timestamp, UUID } from "@/types/shared-types"

/** Señales de comportamiento y preferencias */
export interface UserFeaturesRow {
  user_id: UUID
  persona: Record<string, any> | null
  preferences: Record<string, any> | null
  affinities: Record<string, any> | null
  behavioral_signals: Record<string, any> | null
  updated_at: Timestamp
}

export type UserFeaturesInsert = Omit<
  UserFeaturesRow,
  'updated_at'
>

export type UserFeaturesUpdate = Partial<
  Omit<UserFeaturesInsert, 'user_id'>
>
