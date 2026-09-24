import type { DraftFields, DraftStatus } from "@/lib/catalog/schema";
import type { UUID, Timestamp } from "@/types/shared-types";

export type DraftSource = "voice" | "xlsx" | "manual";
export type DraftImageStatus = "pending" | "processing" | "done" | "failed";

/** Row of staging.product_drafts */
export interface DraftRow extends DraftFields {
  id: UUID;
  sku: string;
  status: DraftStatus;
  source: DraftSource;
  transcript: string | null;
  ai_raw: unknown;
  source_row: unknown;
  missing_fields: string[];
  field_confidence: Record<string, number>;
  published_product_id: UUID | null;
  published_variant_id: UUID | null;
  published_item_id: UUID | null;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Row of staging.draft_images */
export interface DraftImageRow {
  id: UUID;
  draft_id: UUID;
  position: number;
  is_main: boolean;
  original_key: string | null;
  cutout_key: string | null;
  cutout_web_key: string | null;
  width: number | null;
  height: number | null;
  bytes_original: number | null;
  bytes_cutout: number | null;
  bytes_web: number | null;
  dominant_colors: string[];
  status: DraftImageStatus;
  error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DraftWithImages extends DraftRow {
  images: DraftImageRow[];
}
