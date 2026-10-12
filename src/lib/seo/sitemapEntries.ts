import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { productCanonicalPath, productsListingPath } from "./canonical";

/** Indexable static pages. Legal and help pages ship in a separate PR. */
export const STATIC_PAGES = [
  "/home",
  "/products",
  "/como-comprar",
  "/preguntas-frecuentes",
  "/sobre",
  "/terminos",
  "/privacidad",
] as const;

/**
 * Next 16 writes sitemap URLs into <loc> verbatim, so a query string's `&`
 * would make the XML invalid. Escape here; re-check if Next starts escaping.
 */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const loc = (path: string, base: string) => xmlEscape(absoluteUrl(path, base));

type Category ={ id: string; slug: string; parentId: string | null };
type Product = { id: string; subcategoryId: string | null; updatedAt: string | null };

/**
 * Sitemap entries: static pages, category listings that hold at least one
 * sellable product (query-param form), and sellable product pages.
 */
export function buildSitemapEntries(
  base: string,
  categories: readonly Category[],
  products: readonly Product[],
): MetadataRoute.Sitemap {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const listings = new Set<string>();

  for (const product of products) {
    const sub = product.subcategoryId ? byId.get(product.subcategoryId) : undefined;
    const parent = sub?.parentId ? byId.get(sub.parentId) : undefined;
    if (!sub || !parent) continue;
    listings.add(productsListingPath(parent.slug));
    listings.add(productsListingPath(parent.slug, sub.slug));
  }

  return [
    ...STATIC_PAGES.map((path) => ({ url: loc(path, base) })),
    ...[...listings].sort().map((path) => ({ url: loc(path, base) })),
    ...products.map((product) => ({
      url: loc(productCanonicalPath(product.id), base),
      ...(product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}),
    })),
  ];
}
