import { Timestamp, UUID } from "../shared-types"

/** Producto base, no vendible directamente */
export interface ProductRow {
  id: UUID
  name: string
  brand: string
  description: string | null
  category_id: UUID | null
  is_active: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

export type ProductInsert = Omit<
  ProductRow,
  'id' | 'created_at' | 'updated_at'
>

export type ProductUpdate = Partial<ProductInsert>

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type Colors = 'Red' | 'Blue' | 'Green' | 'Black' | 'White' | 'Yellow' | 'Purple' | 'Gray';