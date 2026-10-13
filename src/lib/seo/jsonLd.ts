/**
 * Pure schema.org JSON-LD builders for product pages.
 * Every URL is made absolute against the given site origin.
 */

import { absoluteUrl } from "./site";

export type SchemaAvailability =
  | "https://schema.org/InStock"
  | "https://schema.org/OutOfStock"
  | "https://schema.org/SoldOut";

export type ItemStock = { status: string | null; stock: number | null };

/**
 * One-off second-hand items: an available unit is in stock, a reserved unit is
 * temporarily out of stock (it may come back), and anything else is sold.
 */
export function availabilityFromItems(items: readonly ItemStock[]): SchemaAvailability {
  const withStock = items.filter((item) => (item.stock ?? 0) > 0);
  if (withStock.some((item) => (item.status ?? "available") === "available")) {
    return "https://schema.org/InStock";
  }
  if (withStock.some((item) => item.status === "reserved")) {
    return "https://schema.org/OutOfStock";
  }
  return "https://schema.org/SoldOut";
}

export type ProductJsonLdInput = {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  price: number;
  images: readonly string[];
  items: readonly ItemStock[];
  /** Relative or absolute canonical product URL. */
  url: string;
};

export function buildProductJsonLd(input: ProductJsonLdInput, base: string) {
  const url = absoluteUrl(input.url, base);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    image: input.images.map((src) => absoluteUrl(src, base)),
    url,
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url,
      price: input.price.toFixed(2),
      priceCurrency: "PEN",
      availability: availabilityFromItems(input.items),
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}

export type Crumb = { name: string; path: string };

export function buildBreadcrumbJsonLd(crumbs: readonly Crumb[], base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, base),
    })),
  };
}

/**
 * Serializes JSON-LD for an inline <script>. Escaping `<`, `>` and `&` as
 * JSON unicode escapes keeps a value such as `</script>` or `<!--` from
 * breaking out of the tag, and the output still parses to the same data.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
