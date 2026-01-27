import { Timestamp, UUID } from "../shared-types"

/** Variante visual/estructural de un producto */
export interface ProductVariantRow {
  id: UUID
  product_id: UUID
  size: string | null
  main_color_hex: string | null
  main_color_category_id: UUID | null
  main_img_url: string | null
  gender: string | null
  fit: string | null
  metadata: Record<string, any> | null
  created_at: Timestamp
}

export type ProductVariantInsert = Omit<
  ProductVariantRow,
  'id' | 'created_at'
>

export type ProductVariantUpdate = Partial<ProductVariantInsert>
