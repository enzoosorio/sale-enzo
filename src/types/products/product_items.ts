import { UUID, Timestamp } from "@/types/shared-types"

export type ProductCondition =
  | 'new'
  | 'like_new'
  | 'semi-used'
  | 'used'
  | 'worn'

export type ProductItemStatus =
  | 'active'
  | 'hidden'
  | 'sold'

/** Unidad vendible concreta */
export interface ProductItemRow {
  id: UUID
  variant_id: UUID
  condition: ProductCondition
  price: number
  sku: string | null
  stock: number
  seller_id: UUID | null
  status: ProductItemStatus
  created_at: Timestamp
}

export type ProductItemInsert = Omit<
  ProductItemRow,
  'id' | 'created_at'
>

export type ProductItemUpdate = Partial<ProductItemInsert>
