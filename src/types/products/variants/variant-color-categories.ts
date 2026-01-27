import { Timestamp, UUID } from "@/types/shared-types"

/** Clusters de color (centroides LAB) */
export interface VariantColorCategoryRow {
  id: UUID
  centroid_l: number
  centroid_a: number
  centroid_b: number
  representative_hex: string
  created_at: Timestamp
  updated_at: Timestamp
}

export type VariantColorCategoryInsert = Omit<
  VariantColorCategoryRow,
  'id' | 'created_at' | 'updated_at'
>

export type VariantColorCategoryUpdate = Partial<VariantColorCategoryInsert>
