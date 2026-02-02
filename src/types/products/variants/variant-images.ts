import { Timestamp, UUID } from "@/types/shared-types"

/** Image position types */
export type ImagePosition = "front" | "back" | "logo" | "detail" | "random";

/** Imágenes adicionales de una variante */
export interface VariantImageRow {
  id: UUID
  variant_id: UUID
  image_url: string
  position: ImagePosition | null
  created_at: Timestamp
}

export type VariantImageInsert = Omit<
  VariantImageRow,
  'id' | 'created_at'
>

export type VariantImageUpdate = Partial<Omit<VariantImageInsert, 'variant_id'>>
