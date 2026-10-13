/**
 * Display wording for values that arrive from the catalog (sizes, gender, stock).
 * Only presentation: the raw values stay untouched in URLs, filters and data.
 */

/** "M" -> "Talla M"; the catalog's "ONE SIZE" reads as "Talla única". */
export function sizeLabel(size: string | null | undefined): string | null {
  const clean = size?.trim();
  if (!clean) return null;
  return /^(one\s*size|unica|única)$/i.test(clean) ? 'Talla única' : `Talla ${clean}`;
}

const GENDER_LABELS: Record<string, string> = { male: 'Hombre', female: 'Mujer', unisex: 'Unisex' };

/** "male" -> "Hombre"; unknown values pass through unchanged. */
export function genderLabel(gender: string): string {
  return GENDER_LABELS[gender.toLowerCase()] ?? gender;
}

/** Every piece is a one-off, so a single unit reads as "Pieza única". */
export function stockLabel(stock: number): string {
  if (stock <= 0) return 'Ya no está disponible';
  return stock === 1 ? 'Pieza única' : `${stock} disponibles`;
}

/** "ropa-superior" -> "Ropa superior": a readable fallback when only the URL slug is known. */
export function slugLabel(slug: string): string {
  const text = slug.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
