/**
 * R2 object key layout, shared by client workers and server routes.
 *   originals/{category}/{sku}/{n}.jpg            (private bucket)
 *   cutout/{category}/{sku}/{n}.webp              (public bucket, full resolution)
 *   web/{category}/{sku}/{n}.webp                 (public bucket, compressed)
 *   ironed/{category}/{sku}/{n}-v{ver}.webp       (public bucket, ironed full)
 *   ironed-web/{category}/{sku}/{n}-v{ver}.webp   (public bucket, ironed compressed)
 *
 * Public media is served with `immutable` one-year caching, so a rendition that
 * can be regenerated (ironed) carries a version in its key instead of being overwritten.
 */

export type ImageKind = "original" | "cutout" | "web" | "ironed" | "ironed-web";

const PREFIX: Record<ImageKind, string> = {
  original: "originals",
  cutout: "cutout",
  web: "web",
  ironed: "ironed",
  "ironed-web": "ironed-web",
};

/** Kinds whose key carries a generation number. */
export const isVersionedKind = (kind: ImageKind): boolean => kind === "ironed" || kind === "ironed-web";

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/i;

export function imageKey(
  kind: ImageKind,
  categorySlug: string,
  sku: string,
  position: number,
  version?: number,
): string {
  const category = SAFE_SEGMENT.test(categorySlug) ? categorySlug : "uncategorized";
  const ext = kind === "original" ? "jpg" : "webp";
  if (isVersionedKind(kind)) {
    if (!Number.isInteger(version) || (version as number) < 1) throw new Error(`${kind} keys need a version >= 1`);
    return `${PREFIX[kind]}/${category}/${sku}/${position}-v${version}.${ext}`;
  }
  return `${PREFIX[kind]}/${category}/${sku}/${position}.${ext}`;
}

/** Guards presign requests: the key must belong to this sku and have the expected shape. */
export function isKeyForSku(key: string, sku: string): boolean {
  const m = key.match(
    /^(originals|cutout|web|ironed|ironed-web)\/([a-z0-9-]+)\/([A-Z]{2}-\d{4,})\/(\d{1,2})(-v\d{1,2})?\.(jpg|webp)$/i,
  );
  if (!m || m[3] !== sku) return false;
  const [, prefix, , , , version, ext] = m;
  const versioned = prefix === "ironed" || prefix === "ironed-web";
  return (prefix === "originals") === (ext === "jpg") && versioned === !!version;
}

export const bucketForKind = (kind: ImageKind): "originals" | "media" =>
  kind === "original" ? "originals" : "media";
