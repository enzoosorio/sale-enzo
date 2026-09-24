import { z } from "zod";

/**
 * Single source of truth for the catalog's closed vocabularies.
 * Drives: staging draft validation, OpenAI Structured Outputs schema,
 * form select options and publish-time validation.
 */

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
export const GENDERS = ["male", "female", "unisex"] as const;
export const FITS = ["slim", "regular", "oversize", "boxy"] as const;
export const ITEM_STATUSES = ["available", "reserved", "sold"] as const;
export const DRAFT_STATUSES = [
  "capturing",
  "pending_review",
  "approved",
  "published",
  "discarded",
] as const;
export const IMAGE_STATUSES = ["pending", "processing", "done", "failed"] as const;
export const MATCH_KINDS = ["new_product", "new_variant", "new_item"] as const;
export const DRAFT_SOURCES = ["voice", "xlsx", "manual"] as const;

/** Closed keys for product_variants.metadata (semantic enrichment). */
export const METADATA_KEYS = [
  "team",
  "university",
  "league",
  "player",
  "number",
  "technology",
  "edition",
  "collection",
  "sport",
  "use",
  "material",
] as const;

export const DEFECT_TYPES = [
  "hole",
  "stain",
  "pilling",
  "fading",
  "wear",
  "pull",
  "other",
] as const;
export const DEFECT_SEVERITIES = ["minimal", "mild", "noticeable"] as const;

export const SizeSchema = z.enum(SIZES);
export const GenderSchema = z.enum(GENDERS);
export const FitSchema = z.enum(FITS);
export const MatchKindSchema = z.enum(MATCH_KINDS);
export const DraftStatusSchema = z.enum(DRAFT_STATUSES);
export const DraftSourceSchema = z.enum(DRAFT_SOURCES);
export const ImageStatusSchema = z.enum(IMAGE_STATUSES);

export type Size = z.infer<typeof SizeSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type Fit = z.infer<typeof FitSchema>;
export type MatchKind = z.infer<typeof MatchKindSchema>;
export type DraftStatus = z.infer<typeof DraftStatusSchema>;
export type MetadataKey = (typeof METADATA_KEYS)[number];

/** Condition score: 1–10 in 0.5 steps. */
export const ConditionScoreSchema = z
  .number()
  .min(1)
  .max(10)
  .refine((n) => Number.isInteger(n * 2), "Condition must use 0.5 steps");

export const DefectSchema = z.object({
  type: z.enum(DEFECT_TYPES),
  zone: z.string().min(1),
  severity: z.enum(DEFECT_SEVERITIES),
  note: z.string().nullable(),
});
export type Defect = z.infer<typeof DefectSchema>;

export const VariantMetadataSchema = z.partialRecord(z.enum(METADATA_KEYS), z.string().min(1));
export type VariantMetadata = z.infer<typeof VariantMetadataSchema>;

/**
 * Staging draft fields. Everything nullable: a draft fills up progressively
 * (voice, xlsx, manual edits). Publish-time strictness lives in PublishableDraftSchema.
 */
export const DraftFieldsSchema = z.object({
  // Segmentation
  match_kind: MatchKindSchema.nullable(),
  target_product_id: z.uuid().nullable(),
  target_variant_id: z.uuid().nullable(),
  /** Sibling draft (not yet published) this one attaches to; resolved at publish time. */
  target_draft_id: z.uuid().nullable(),
  match_reason: z.string().nullable(),

  // Product level
  name: z.string().min(1).nullable(),
  brand: z.string().min(1).nullable(),
  description: z.string().nullable(),
  category_id: z.uuid().nullable(),
  subcategory_id: z.uuid().nullable(),

  // Variant level
  size: SizeSchema.nullable(),
  gender: GenderSchema.nullable(),
  also_unisex: z.boolean(),
  fit: FitSchema.nullable(),
  fits_like_min: SizeSchema.nullable(),
  fits_like_max: SizeSchema.nullable(),
  metadata: VariantMetadataSchema,
  main_color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  secondary_colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  tags: z.array(z.string().min(1)),

  // Item level
  condition_score: ConditionScoreSchema.nullable(),
  condition_note: z.string().nullable(),
  price: z.number().positive().nullable(),
  compare_at_price: z.number().positive().nullable(),
  stock: z.number().int().min(0),

  // Private (never reaches the storefront)
  specs_raw: z.string().nullable(),
  defects: z.array(DefectSchema),
  price_notes: z.string().nullable(),
  internal_notes: z.string().nullable(),
});
export type DraftFields = z.infer<typeof DraftFieldsSchema>;

export const EMPTY_DRAFT_FIELDS: DraftFields = {
  match_kind: null,
  target_product_id: null,
  target_variant_id: null,
  target_draft_id: null,
  match_reason: null,
  name: null,
  brand: null,
  description: null,
  category_id: null,
  subcategory_id: null,
  size: null,
  gender: null,
  also_unisex: false,
  fit: null,
  fits_like_min: null,
  fits_like_max: null,
  metadata: {},
  main_color_hex: null,
  secondary_colors: [],
  tags: [],
  condition_score: null,
  condition_note: null,
  price: null,
  compare_at_price: null,
  stock: 1,
  specs_raw: null,
  defects: [],
  price_notes: null,
  internal_notes: null,
};

/** Fields that must be non-null before a draft can be published. */
export const REQUIRED_FIELDS = [
  "match_kind",
  "name",
  "brand",
  "category_id",
  "subcategory_id",
  "size",
  "gender",
  "fit",
  "main_color_hex",
  "condition_score",
  "price",
] as const satisfies readonly (keyof DraftFields)[];
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const MIN_DONE_IMAGES = 2;

/** Returns the required fields still missing, including match-target consistency. */
export function computeMissingFields(d: DraftFields): string[] {
  const missing: string[] = REQUIRED_FIELDS.filter((k) => d[k] === null || d[k] === "");
  const hasTarget = (id: string | null) => !!id || !!d.target_draft_id;
  if (d.match_kind === "new_variant" && !hasTarget(d.target_product_id)) missing.push("target_product_id");
  if (d.match_kind === "new_item" && !hasTarget(d.target_variant_id)) missing.push("target_variant_id");
  if (Object.keys(d.metadata).length === 0) missing.push("metadata");
  return missing;
}

/** Legacy text label kept in product_items.condition for existing queries. */
export function conditionLabel(score: number): "new" | "like_new" | "used" | "worn" {
  if (score >= 10) return "new";
  if (score >= 9) return "like_new";
  if (score >= 7) return "used";
  return "worn";
}

export const SIZE_LABELS: Record<Size, string> = {
  XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL", XXXL: "XXXL",
};
export const GENDER_LABELS: Record<Gender, string> = {
  male: "Masculino",
  female: "Femenino",
  unisex: "Unisex",
};
export const FIT_LABELS: Record<Fit, string> = {
  slim: "Slim",
  regular: "Regular",
  oversize: "Oversize",
  boxy: "Boxy",
};
