/** Client-safe helpers for public R2 media URLs. */

const MEDIA_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

export const mediaUrl = (key: string | null | undefined): string | null =>
  key && MEDIA_BASE ? `${MEDIA_BASE}/${key}` : null;

/**
 * Same as mediaUrl with a cache-busting stamp. Public media is cached as immutable,
 * so a rendition rewritten in place (a redone cutout) needs a new URL to show up.
 */
export const mediaUrlStamped = (key: string | null | undefined, stamp: string | number | null | undefined): string | null => {
  const url = mediaUrl(key);
  return url && stamp ? `${url}?v=${encodeURIComponent(String(stamp))}` : url;
};

/** Transparent cutouts look best contained on a neutral backdrop instead of cropped. */
export const isCutoutUrl = (url: string | null | undefined): boolean =>
  !!url && !!MEDIA_BASE && url.startsWith(MEDIA_BASE) && /\/(web|cutout)\//.test(url);

const OPTIMIZABLE_HOSTS = [
  "hdbhvgxogazmawphpcnj.supabase.co",
  "images.unsplash.com",
  "images.pexels.com",
  MEDIA_BASE ? new URL(MEDIA_BASE).hostname : null,
].filter(Boolean);

/** next/image only optimizes hosts listed in next.config remotePatterns; others render unoptimized. */
export function canOptimize(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZABLE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export const formatPrice = (price: number): string => `S/ ${price.toFixed(2)}`;
