/** Pure shaping for the home overview grid. Server fetch lives in getHomeProducts.ts. */

export const HOME_PRODUCTS_LIMIT = 24;

/** Same visibility rule as get_products_for_grid_v2 and the product detail page. */
const SELLABLE_STATUSES = ["available", "reserved"];

export type HomeItemRow = {
  id: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | null;
  status: string | null;
};

export type HomeVariantRow = {
  id: string;
  main_img_url: string | null;
  product_items: HomeItemRow[] | null;
};

export type HomeProductRow = {
  id: string;
  name: string;
  brand: string | null;
  is_active: boolean;
  created_at: string;
  product_variants: HomeVariantRow[] | null;
};

export type HomeProductCard = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
};

export const isSellableItem = (item: HomeItemRow): boolean =>
  (item.stock ?? 0) > 0 && SELLABLE_STATUSES.includes(item.status ?? "available");

const toPrice = (value: number | string | null): number | null => {
  if (value === null) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
};

/**
 * One card per active product with at least one sellable item, newest first.
 * The card shows the cheapest sellable item, preferring variants that have a photo.
 */
export function toHomeProductCards(
  rows: HomeProductRow[],
  limit: number = HOME_PRODUCTS_LIMIT,
): HomeProductCard[] {
  const seen = new Set<string>();
  const cards: HomeProductCard[] = [];

  const ordered = [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  for (const product of ordered) {
    if (!product.is_active || seen.has(product.id)) continue;

    const candidates = (product.product_variants ?? []).flatMap((variant) =>
      (variant.product_items ?? [])
        .filter(isSellableItem)
        .map((item) => ({ variant, item, price: toPrice(item.price) }))
        .filter((candidate): candidate is typeof candidate & { price: number } => candidate.price !== null),
    );
    if (candidates.length === 0) continue;

    const best = candidates.sort(
      (a, b) => Number(!a.variant.main_img_url) - Number(!b.variant.main_img_url) || a.price - b.price,
    )[0];
    const compareAtPrice = toPrice(best.item.compare_at_price);

    seen.add(product.id);
    cards.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: best.price,
      compareAtPrice: compareAtPrice !== null && compareAtPrice > best.price ? compareAtPrice : null,
      imageUrl: best.variant.main_img_url,
    });

    if (cards.length >= limit) break;
  }

  return cards;
}
