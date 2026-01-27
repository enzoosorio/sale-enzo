import { Timestamp, UUID } from "@/types/shared-types"

/** Eventos de interacción para recomendaciones */
export interface UserInteractionRow {
  id: UUID
  user_id: UUID | null
  product_id: UUID | null
  variant_id: UUID | null
  interaction_type: string
  metadata: Record<string, any> | null
  created_at: Timestamp
}

export type UserInteractionInsert = Omit<
  UserInteractionRow,
  'id' | 'created_at'
>

export type UserInteractionUpdate = never
