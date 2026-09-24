import type { DraftFields } from "@/lib/catalog/schema";
import type { TaxonomyNode } from "@/lib/catalog/extract";
import {
  cleanText,
  matchBrand,
  normalizeCondition,
  normalizeFitColumn,
  normalizeGender,
  normalizePrice,
  normalizeSize,
  normalizeSlug,
} from "./normalizers";

/** Columns of the legacy "SALE ENZO.xlsx" sheet (second header row). */
export interface LegacyRow {
  name?: unknown;
  brand?: unknown;
  category?: unknown;
  subcategory?: unknown;
  size?: unknown;
  fit?: unknown;
  gender?: unknown;
  metadata?: unknown;
  condition?: unknown;
  especificaciones?: unknown;
  tela?: unknown;
  "posible precio"?: unknown;
}

export const isJunkRow = (row: LegacyRow): boolean => {
  const name = cleanText(row.name);
  return !name || name.length < 5 || !cleanText(row.brand);
};

/** Renders the row as labeled lines for the extraction prompt. */
export function rowToUtterance(row: LegacyRow): string {
  return Object.entries(row)
    .map(([k, v]) => [k, cleanText(v)] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/**
 * Deterministic part of the mapping. These values override the model output:
 * they have exactly one interpretation, so the AI never gets to change them.
 */
export function deterministicFields(
  row: LegacyRow,
  ctx: { taxonomy: TaxonomyNode[]; brands: string[] },
): Partial<DraftFields> {
  const out: Partial<DraftFields> = {};

  const size = normalizeSize(row.size);
  if (size) out.size = size;

  const { gender, also_unisex } = normalizeGender(row.gender);
  if (gender) Object.assign(out, { gender, also_unisex });

  const fit = normalizeFitColumn(row.fit);
  if (fit.fit) out.fit = fit.fit;
  if (fit.fits_like_min) Object.assign(out, { fits_like_min: fit.fits_like_min, fits_like_max: fit.fits_like_max });

  const condition = normalizeCondition(row.condition);
  if (condition !== null) out.condition_score = condition;

  const price = normalizePrice(row["posible precio"]);
  out.price = price.price;
  out.compare_at_price = price.compare_at_price;
  out.price_notes = price.price_notes;

  const brand = matchBrand(row.brand, ctx.brands);
  if (brand) out.brand = brand;

  const slug = normalizeSlug(row.subcategory);
  for (const category of ctx.taxonomy) {
    const sub = category.children.find((s) => s.slug === slug);
    if (sub) Object.assign(out, { category_id: category.id, subcategory_id: sub.id });
  }

  return out;
}
