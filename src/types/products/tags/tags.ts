import { Timestamp, UUID } from "@/types/shared-types"

/** Tags normalizados para filtros y RAG */
export interface TagRow {
  id: UUID
  name: string
  slug: string
  created_at: Timestamp
}

export type TagInsert = Omit<TagRow, 'id' | 'created_at'>
export type TagUpdate = Partial<TagInsert>
