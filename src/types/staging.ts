import type { CutoutQuality } from "@/lib/capture/imageOps";
import type { IronCheck } from "@/lib/capture/ironCheck";
import type { DraftFields, DraftStatus, ShotRole } from "@/lib/catalog/schema";
import type { UUID, Timestamp } from "@/types/shared-types";

export type DraftSource = "voice" | "xlsx" | "manual";
export type DraftImageStatus = "pending" | "processing" | "done" | "failed";
/** none → pending (generating) → ready (owner decides) → accepted (ships) | rejected | failed */
export type IronedStatus = "none" | "pending" | "ready" | "accepted" | "rejected" | "failed";

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
  /** Provenance per DraftFields key: "user" (owner typed/dictated) or "ai" (photo analysis). */
  field_source: Record<string, "user" | "ai">;
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
  /** Named slot (front, back...) or null while the photo is unassigned */
  shot_role: ShotRole | null;
  original_key: string | null;
  cutout_key: string | null;
  cutout_web_key: string | null;
  width: number | null;
  height: number | null;
  bytes_original: number | null;
  bytes_cutout: number | null;
  bytes_web: number | null;
  dominant_colors: string[];
  /** Provider whose cutout was kept, and the quality gate's verdict on it */
  bg_provider: "imgly" | "replicate" | null;
  cutout_quality: CutoutQuality | null;
  /** No provider passed the gate: the owner must check this cutout */
  needs_review: boolean;
  /** AI-ironed rendition (versioned R2 keys); only ships when accepted */
  ironed_status: IronedStatus;
  ironed_key: string | null;
  ironed_web_key: string | null;
  ironed_provider: string | null;
  ironed_version: number;
  ironed_check: IronCheck | null;
  status: DraftImageStatus;
  error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DraftWithImages extends DraftRow {
  images: DraftImageRow[];
}
