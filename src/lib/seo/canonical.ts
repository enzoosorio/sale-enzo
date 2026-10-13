/**
 * Canonical URL builders. Listing filters (color, size, gender, fit, page...)
 * never reach a canonical: only the category hierarchy defines a listing page.
 */

type ParamValue = string | string[] | undefined;
export type ListingParams = Record<string, ParamValue>;

function firstValue(value: ParamValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

/** Category and subcategory slugs from listing search params. */
export function listingSlugs(params: ListingParams): { category?: string; subcategory?: string } {
  return { category: firstValue(params.category), subcategory: firstValue(params.subcategory) };
}

/** Relative /products URL for a category hierarchy, e.g. `/products?category=ropa&subcategory=polos`. */
export function productsListingPath(category?: string, subcategory?: string): string {
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (category && subcategory) query.set("subcategory", subcategory);
  const qs = query.toString();
  return qs ? `/products?${qs}` : "/products";
}

/** Relative canonical for a product: never carries `?variant=`. */
export function productCanonicalPath(productId: string): string {
  return `/products/${encodeURIComponent(productId)}`;
}
