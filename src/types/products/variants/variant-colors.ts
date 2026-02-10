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
  weight: number // Peso del color (1.0 para main, 0.3 para secondary)
  created_at: Timestamp
}

export type VariantColorInsert = Omit<
  VariantColorRow,
  'id' | 'created_at'
>

export type VariantColorUpdate = Partial<VariantColorInsert>
