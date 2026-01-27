import { Timestamp, UUID, Vector1536 } from "@/types/shared-types"

/** Perfil semántico del usuario */
export interface UserRagProfileRow {
  user_id: UUID
  summary_text: string
  embedding: Vector1536 | null
  version: number
  updated_at: Timestamp
}

export type UserRagProfileInsert = Omit<
  UserRagProfileRow,
  'updated_at'
>

export type UserRagProfileUpdate = Partial<
  Omit<UserRagProfileInsert, 'user_id'>
>
