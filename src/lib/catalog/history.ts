import type { DraftRow } from "@/types/staging";
import type { CatalogProduct, CatalogVariant, ExtractionContext } from "./extract";
import type { DraftFields } from "./schema";
import { designSimilarity, PROMOTE_MIN_SIMILARITY } from "./similarity";

/**
 * Learning from previously captured pieces: attributes that repeat across
 * similar products/drafts are promoted into new captures, and published drafts
 * where the owner corrected the AI become few-shot correction pairs.
 *
 * Pure: no DB, no network. The caller (analyze-photos route) supplies the
 * extraction context and the published drafts with their ai_raw payloads.
 */

/** Stable attributes: same design usually keeps them; the owner rarely retypes them. */
export const STABLE_ATTRIBUTE_KEYS = [
  "subcategory_id",
  "tags",
  "metadata",
  "fit",
  "fits_like_min",
  "fits_like_max",
  "gender",
] as const satisfies readonly (keyof DraftFields)[];

/** Metadata keys that are design-stable and safe to inherit from similar pieces. */
export const PROMOTED_METADATA_KEYS = [
  "technology",
  "material",
  "team",
  "university",
  "league",
  "player",
  "number",
  "sport",
  "edition",
  "collection",
] as const;

/** Fields the owner sets per item; NEVER inherited from history. */
export const NEVER_PROMOTE_KEYS = [
  "price",
  "size",
  "condition_score",
  "condition_note",
  "stock",
  "name",
  "brand",
  "description",
  "defects",
] as const;

export interface StableAttributePromotion {
  key: string;
  value: unknown;
  confidence: number;
  evidence: string;
}

export interface CorrectionPair {
  name: string;
  brand: string | null;
  /** Effective raw AI payload (photos.raw preferred, else voice raw). */
  ai_raw: unknown;
  /** Final owner-approved values for the stable attributes that changed. */
  final: Partial<DraftFields>;
}

/** A published draft row as the route fetches it: identity + ai_raw + final field values. */
export type PublishedDraftRow = {
  id: string;
  name: string | null;
  brand: string | null;
  ai_raw: unknown;
  published_at?: string | null;
} & Partial<DraftFields>;

export interface HistoryExamples {
  /** Up to 3 most similar products/drafts for few-shot prompting. */
  examples: CatalogProduct[];
  /** Up to 3 correction pairs from published drafts where ai_raw differed from final values. */
  corrections: CorrectionPair[];
  /** Stable attributes promoted from similar products/drafts. */
  promotions: StableAttributePromotion[];
}

export interface BuildHistoryOptions {
  maxExamples?: number;
  maxCorrections?: number;
  /** Minimum design similarity for attribute promotion. Defaults to PROMOTE_MIN_SIMILARITY. */
  similarityThreshold?: number;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const isEmptyAttr = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    );
  }
  return false;
};

/** Loose normalization for ai_raw vs final comparison (trim + lowercase, sets for arrays). */
const normalizeAttr = (value: unknown): unknown => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }
  if (Array.isArray(value)) {
    const items = value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    return items.length > 0 ? [...new Set(items)].sort() : null;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => [k, typeof v === "string" ? (v as string).trim().toLowerCase() : v]);
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }
  return value;
};

/** The raw extraction payload a draft was created from: photos.raw preferred, else voice raw. */
const effectiveRaw = (ai_raw: unknown): Record<string, unknown> | null => {
  if (typeof ai_raw !== "object" || ai_raw === null) return null;
  const obj = ai_raw as Record<string, unknown>;
  const photos = obj.photos;
  if (photos && typeof photos === "object") {
    const raw = (photos as Record<string, unknown>).raw;
    if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  }
  const voice = obj.raw;
  if (voice && typeof voice === "object") return voice as Record<string, unknown>;
  return null;
};

/** Variant-level attribute of a catalog product: promoted only when every variant agrees. */
const variantAgree = <T>(
  product: CatalogProduct,
  pick: (v: CatalogVariant) => T | null | undefined,
): T | null => {
  const values = (product.variants ?? [])
    .map(pick)
    .filter((v): v is T => v !== null && v !== undefined && !isEmptyAttr(v));
  if (values.length === 0) return null;
  const first = values[0];
  return values.every((v) => deepEqual(v, first)) ? first : null;
};

/** Metadata subset of a candidate: per key, kept only when its variants agree. */
const candidateMetadata = (product: CatalogProduct): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PROMOTED_METADATA_KEYS) {
    const values = (product.variants ?? [])
      .map((v) => v.metadata?.[key])
      .filter((v): v is string => typeof v === "string" && v.trim() !== "");
    const uniq = [...new Set(values)];
    if (uniq.length === 1) out[key] = uniq[0];
  }
  return out;
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildPromotions(candidates: CatalogProduct[]): StableAttributePromotion[] {
  const promotions: StableAttributePromotion[] = [];
  if (candidates.length === 0) return promotions;

  const push = (key: string, value: unknown, contributors: number, evidence: string) => {
    if (isEmptyAttr(value)) return;
    promotions.push({ key, value, confidence: contributors > 1 ? 0.9 : 0.85, evidence });
  };

  /** Scalar attribute: promoted only if all candidates that have it agree. */
  const agreeOn = <T>(key: string, extract: (p: CatalogProduct) => T | null | undefined) => {
    const collected = candidates
      .map((c) => ({ value: extract(c), name: c.name }))
      .filter((e): e is { value: T; name: string } => !isEmptyAttr(e.value));
    if (collected.length === 0) return;
    const first = collected[0].value;
    if (!collected.every((e) => deepEqual(e.value, first))) return; // disagreement: don't promote
    push(key, first, collected.length, `igual a ${collected[0].name}`);
  };

  agreeOn("subcategory_id", (p) => p.subcategory_id);
  agreeOn("fit", (p) => variantAgree(p, (v) => v.fit));
  agreeOn("fits_like_min", (p) => variantAgree(p, (v) => v.fits_like_min));
  agreeOn("fits_like_max", (p) => variantAgree(p, (v) => v.fits_like_max));
  agreeOn("gender", (p) => variantAgree(p, (v) => v.gender));

  // tags: deduplicated union across all variants of the similar candidates.
  const tagContributors = candidates.filter((c) =>
    (c.variants ?? []).some((v) => (v.tags ?? []).length > 0),
  );
  if (tagContributors.length > 0) {
    const union = [
      ...new Set(
        candidates
          .flatMap((c) => c.variants ?? [])
          .flatMap((v) => v.tags ?? [])
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    push("tags", union, tagContributors.length, `igual a ${tagContributors[0].name}`);
  }

  // metadata: per-key agreement across candidates (a key that disagrees is dropped).
  const metadataByCandidate = candidates.map(candidateMetadata);
  const firstMetaIndex = metadataByCandidate.findIndex((m) => Object.keys(m).length > 0);
  if (firstMetaIndex >= 0) {
    const merged: Record<string, string> = {};
    for (const key of PROMOTED_METADATA_KEYS) {
      const values = metadataByCandidate.map((m) => m[key]).filter((v): v is string => !!v);
      const uniq = [...new Set(values)];
      if (uniq.length === 1) merged[key] = uniq[0];
    }
    const contributors = metadataByCandidate.filter((m) => Object.keys(m).length > 0).length;
    push("metadata", merged, contributors, `igual a ${candidates[firstMetaIndex].name}`);
  }

  return promotions;
}

function buildCorrections(published: PublishedDraftRow[], max: number): CorrectionPair[] {
  const corrections: CorrectionPair[] = [];
  const sorted = [...published].sort((a, b) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? ""),
  );

  for (const draft of sorted) {
    if (corrections.length >= max) break;
    if (!draft.name?.trim()) continue;
    const raw = effectiveRaw(draft.ai_raw);
    if (!raw) continue;

    const final: Partial<DraftFields> = {};
    for (const key of STABLE_ATTRIBUTE_KEYS) {
      const rawValue = normalizeAttr(raw[key]);
      if (isEmptyAttr(rawValue)) continue; // AI proposed nothing: not a correction
      const finalValue = normalizeAttr(draft[key]);
      if (!deepEqual(rawValue, finalValue)) {
        (final as Record<string, unknown>)[key] = draft[key];
      }
    }

    if (Object.keys(final).length > 0) {
      corrections.push({ name: draft.name.trim(), brand: draft.brand, ai_raw: raw, final });
    }
  }

  return corrections;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildHistory(
  ctx: ExtractionContext,
  currentDraft: Pick<DraftRow, "name" | "brand">,
  publishedDrafts: PublishedDraftRow[],
  opts: BuildHistoryOptions = {},
): HistoryExamples {
  const maxExamples = opts.maxExamples ?? 3;
  const maxCorrections = opts.maxCorrections ?? 3;
  const threshold = opts.similarityThreshold ?? PROMOTE_MIN_SIMILARITY;

  const currentName = currentDraft.name?.trim() ?? "";
  const currentBrand = currentDraft.brand?.trim() || null;

  const scored = ctx.catalog
    .map((candidate) => {
      const brandMatches =
        !currentBrand || !candidate.brand || currentBrand.toLowerCase() === candidate.brand.toLowerCase();
      const similarity = brandMatches ? designSimilarity(currentName, candidate.name, currentBrand) : 0;
      return { candidate, similarity };
    })
    .filter((s) => s.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);

  const examples = scored.slice(0, maxExamples).map((s) => s.candidate);
  const promotions = buildPromotions(
    scored.filter((s) => s.similarity >= threshold).map((s) => s.candidate),
  );
  const corrections = buildCorrections(publishedDrafts, maxCorrections);

  return { examples, corrections, promotions };
}
