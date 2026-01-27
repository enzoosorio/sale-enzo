import { Timestamp, UUID } from "@/types/shared-types"

/** Imágenes adicionales de una variante */
export interface VariantImageRow {
  id: UUID
  variant_id: UUID
  image_url: string
  position: number | null
  created_at: Timestamp
}

export type VariantImageInsert = Omit<
  VariantImageRow,
  'id' | 'created_at'
>

export type VariantImageUpdate = Partial<VariantImageInsert>
