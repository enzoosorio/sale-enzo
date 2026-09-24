/**
 * "Design" similarity between product names: same model/print regardless of
 * color. Used to double-check the model's segmentation, which on small models
 * over-merges unrelated items and misses obvious color siblings.
 */

const COLOR_WORDS = new Set([
  "negro", "negra", "blanco", "blanca", "gris", "plomo", "azul", "rojo", "roja", "verde", "amarillo", "amarilla",
  "naranja", "anaranjado", "morado", "morada", "lila", "rosado", "rosada", "rosa", "celeste", "celestino", "aqua",
  "turquesa", "marino", "oscuro", "oscura", "claro", "clara", "humo", "neon", "sand", "grisaceo", "grisacea",
  "destenido", "desteñido", "beige", "crema", "vino", "guinda", "mostaza", "camo", "color", "tono", "tonos",
  "azulado", "azuladas", "azulados", "muy", "casi", "un", "poco",
]);

const STOP_WORDS = new Set([
  "polo", "polos", "de", "del", "la", "el", "los", "las", "con", "y", "o", "en", "para", "t", "shirt", "tshirt",
  "talla", "mujer", "hombre", "unisex", "generico", "comun", "a",
]);

export function designTokens(name: string, brand?: string | null): Set<string> {
  const brandTokens = new Set(
    (brand ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  return new Set(
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/dri[\s-]?fit/g, "drifit")
      .split(/[^a-z0-9]+/)
      .filter((t) => t && !COLOR_WORDS.has(t) && !STOP_WORDS.has(t) && !brandTokens.has(t) && !/^(xs|s|m|l|xl|xxl)$/.test(t)),
  );
}

/** Jaccard similarity of design tokens (0–1). Empty designs never match. */
export function designSimilarity(a: string, b: string, brand?: string | null): number {
  const ta = designTokens(a, brand);
  const tb = designTokens(b, brand);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/** Below this, a proposed variant/item attachment is rejected. */
export const ATTACH_MIN_SIMILARITY = 0.5;
/** At or above this (same brand + subcategory), a "new product" is suggested as a color variant. */
export const PROMOTE_MIN_SIMILARITY = 0.75;
