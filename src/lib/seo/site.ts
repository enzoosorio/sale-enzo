/**
 * Site identity shared by metadata, sitemap, robots and JSON-LD.
 * NEXT_PUBLIC_SITE_URL is inlined at build time, so it is safe in any runtime.
 */

export const SITE_NAME = "Sale Enzo";
export const DEFAULT_SITE_URL = "https://sale-enzo.vercel.app";
export const SITE_LOCALE = "es_PE";
export const SITE_TAGLINE = "Mi clóset de segunda mano";
export const DEFAULT_DESCRIPTION =
  "Vendo la ropa de mi clóset: prendas de segunda mano con fotos reales y el estado de cada una a la vista. Coordinamos por WhatsApp, desde Lima.";

/**
 * Page-level `openGraph` replaces the root one instead of merging with it,
 * so pages that set their own spread these defaults first.
 */
export const BASE_OPEN_GRAPH = { siteName: SITE_NAME, locale: SITE_LOCALE, type: "website" } as const;

/** Route of src/app/opengraph-image.tsx, for pages that set their own openGraph without a picture. */
export const DEFAULT_OG_IMAGE = "/opengraph-image";

/** Shared by private routes: admin, auth, cart, checkout and orders. */
export const NO_INDEX = { index: false, follow: false } as const;

/** Origin of the public site without a trailing slash. */
export function siteUrl(raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/** Resolves a path or URL against the site origin. Absolute URLs are kept as they are. */
export function absoluteUrl(pathOrUrl: string, base: string = siteUrl()): string {
  return new URL(pathOrUrl, `${base}/`).toString();
}
