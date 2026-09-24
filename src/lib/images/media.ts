/** Client-safe helpers for public R2 media URLs. */

const MEDIA_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

export const mediaUrl = (key: string | null | undefined): string | null =>
  key && MEDIA_BASE ? `${MEDIA_BASE}/${key}` : null;

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
