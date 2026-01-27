import { Timestamp, UUID } from "@/types/shared-types"

/** Categorías jerárquicas */
export interface ProductCategoryRow {
  id: UUID
  name: string
  slug: string
  parent_id: UUID | null
  created_at: Timestamp
}

export type ProductCategoryInsert = Omit<
  ProductCategoryRow,
  'id' | 'created_at'
>

export type ProductCategoryUpdate = Partial<ProductCategoryInsert>
