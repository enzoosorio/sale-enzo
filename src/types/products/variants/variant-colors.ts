import { Timestamp, UUID } from "@/types/shared-types"

/** Colores detectados por variante (pueden ser múltiples) */
export interface VariantColorRow {
  id: UUID
  variant_id: UUID
  color_category_id: UUID
  original_hex: string
  l: number
  a: number
  b: number
  created_at: Timestamp
}

export type VariantColorInsert = Omit<
  VariantColorRow,
  'id' | 'created_at'
>

export type VariantColorUpdate = Partial<VariantColorInsert>
