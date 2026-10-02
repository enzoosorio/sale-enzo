import { computeMissingFields, EMPTY_DRAFT_FIELDS, type DraftFields } from "@/lib/catalog/schema";
import type { DraftWithImages } from "@/types/staging";

/**
 * In-memory draft shown before anything exists in the database. `id === ""`
 * means "not saved yet": the wizard creates the real row on the first real
 * input (a photo, a dictation or an edited field).
 */
export function blankDraft(): DraftWithImages {
  const now = new Date().toISOString();
  const fields: DraftFields = { ...EMPTY_DRAFT_FIELDS, match_kind: "new_product" };
  return {
    ...fields,
    id: "",
    sku: "",
    status: "capturing",
    source: "voice",
    transcript: null,
    ai_raw: null,
    source_row: null,
    missing_fields: computeMissingFields(fields),
    field_confidence: {},
    published_product_id: null,
    published_variant_id: null,
    published_item_id: null,
    published_at: null,
    created_at: now,
    updated_at: now,
    images: [],
  };
}

export const isSaved = (draft: { id: string }): boolean => draft.id !== "";
