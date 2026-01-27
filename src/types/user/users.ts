import { Timestamp, UUID } from "@/types/shared-types"

/** User table from auth.users extension */
export interface UserRow {
  id: UUID
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  phone: string | null
  verified_email: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

export type UserInsert = Omit<
  UserRow,
  'id' | 'created_at' | 'updated_at'
>

export type UserUpdate = Partial<
  Omit<UserRow, 'id' | 'created_at' | 'updated_at'>
>
