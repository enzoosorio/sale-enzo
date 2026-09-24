import { SIZES, type Gender, type Size, type Fit } from "@/lib/catalog/schema";

/**
 * Deterministic normalizers for legacy spreadsheet values.
 * They only resolve values with a single unambiguous interpretation;
 * anything else returns null and is left to the AI extraction step.
 */

const clean = (raw: unknown): string =>
  String(raw ?? "")
    .normalize("NFC")
    .replace(/�/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeSize(raw: unknown): Size | null {
  const v = clean(raw).toUpperCase().replace(/^SIZE\s+/, "");
  return (SIZES as readonly string[]).includes(v) ? (v as Size) : null;
}

/** "Male unisex", "male - unisex" → male + also_unisex. */
export function normalizeGender(raw: unknown): { gender: Gender | null; also_unisex: boolean } {
  const v = clean(raw).toLowerCase();
  const hasUnisex = /unisex/.test(v);
  const male = /\b(male|hombre|masculino)\b/.test(v) && !/female/.test(v);
  const female = /\b(female|mujer|femenino)\b/.test(v);

  if (female) return { gender: "female", also_unisex: hasUnisex };
  if (male) return { gender: "male", also_unisex: hasUnisex };
  if (hasUnisex) return { gender: "unisex", also_unisex: false };
  return { gender: null, also_unisex: false };
}

/**
 * The legacy "fit" column mixes real fit ("Slim (S)", "regular")
 * with fits-like sizes ("L", "M - L", "size XS - S").
 */
export function normalizeFitColumn(raw: unknown): {
  fit: Fit | null;
  fits_like_min: Size | null;
  fits_like_max: Size | null;
} {
  const v = clean(raw).toLowerCase();
  const fitMatch = v.match(/\b(slim|regular|oversize|boxy)\b/);
  const fit = (fitMatch?.[1] as Fit | undefined) ?? null;

  const sizePart = v.replace(/\b(slim|regular|oversize|boxy)\b/g, " ").replace(/size|[()]/g, " ");
  const sizes = sizePart
    .split(/\s*[-–/]\s*|\s+/)
    .map((s) => normalizeSize(s))
    .filter((s): s is Size => s !== null);

  if (sizes.length === 0) return { fit, fits_like_min: null, fits_like_max: null };
  const ordered = [...sizes].sort((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b));
  return { fit, fits_like_min: ordered[0], fits_like_max: ordered[ordered.length - 1] };
}

/** "8.5/10" → 8.5, "10/10" → 10. Rounds to 0.5 steps. */
export function normalizeCondition(raw: unknown): number | null {
  const m = clean(raw).replace(",", ".").match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*10)?$/);
  if (!m) return null;
  const n = Math.round(Number(m[1]) * 2) / 2;
  return n >= 1 && n <= 10 ? n : null;
}

/**
 * 59 → price 59
 * "69 pero dcto a 59" → price 59, compare_at 69
 * "69 o 79" → ambiguous: price null, kept in notes for the owner to decide.
 */
export function normalizePrice(raw: unknown): {
  price: number | null;
  compare_at_price: number | null;
  price_notes: string | null;
} {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return { price: raw, compare_at_price: null, price_notes: null };
  }
  const v = clean(raw).toLowerCase();
  if (!v) return { price: null, compare_at_price: null, price_notes: null };

  const discount = v.match(/^(\d+(?:\.\d+)?)\s*(?:pero)?\s*(?:dcto|dscto|descuento)\s*(?:a)?\s*(\d+(?:\.\d+)?)$/);
  if (discount) {
    const [original, final] = [Number(discount[1]), Number(discount[2])];
    return final < original
      ? { price: final, compare_at_price: original, price_notes: null }
      : { price: final, compare_at_price: null, price_notes: v };
  }

  if (/^\d+(?:\.\d+)?$/.test(v)) return { price: Number(v), compare_at_price: null, price_notes: null };
  return { price: null, compare_at_price: null, price_notes: clean(raw) };
}

/** Canonical subcategory slug from loose spellings ("polo manga corta" → "polos-manga-corta"). */
export function normalizeSlug(raw: unknown): string | null {
  const v = clean(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!v) return null;
  return v.replace(/^polo-/, "polos-");
}

/** Canonical brand casing against a known brand list, case/space-insensitive. */
export function matchBrand(raw: unknown, knownBrands: readonly string[]): string | null {
  const key = (s: string) => clean(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const k = key(String(raw ?? ""));
  if (!k) return null;
  return knownBrands.find((b) => key(b) === k) ?? null;
}

export const cleanText = (raw: unknown): string | null => clean(raw) || null;
