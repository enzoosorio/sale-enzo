import { Timestamp, UUID } from "@/types/shared-types"

/** Relación many-to-many entre variantes y tags */
export interface VariantTagRow {
  variant_id: UUID
  tag_id: UUID
  created_at: Timestamp
}

export type VariantTagInsert = Omit<
  VariantTagRow,
  'created_at'
>

export type VariantTagUpdate = never // No se actualizan las relaciones
