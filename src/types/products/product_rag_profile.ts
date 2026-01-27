import { Timestamp, UUID, Vector1536 } from "@/types/shared-types"

/** Perfil semántico para RAG por item */
export interface ProductRagProfileRow {
  product_item_id: UUID
  content: string
  embedding: Vector1536 | null
  version: number
  created_at: Timestamp
  updated_at: Timestamp
}

export type ProductRagProfileInsert = Omit<
  ProductRagProfileRow,
  'created_at' | 'updated_at'
>

export type ProductRagProfileUpdate = Partial<
  Omit<ProductRagProfileInsert, 'product_item_id'>
>
