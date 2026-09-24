/**
 * R2 object key layout, shared by client workers and server routes.
 *   originals/{category}/{sku}/{n}.jpg   (private bucket)
 *   cutout/{category}/{sku}/{n}.webp     (public bucket, full resolution)
 *   web/{category}/{sku}/{n}.webp        (public bucket, compressed)
 */

export type ImageKind = "original" | "cutout" | "web";

const PREFIX: Record<ImageKind, string> = {
  original: "originals",
  cutout: "cutout",
  web: "web",
};

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/i;

export function imageKey(kind: ImageKind, categorySlug: string, sku: string, position: number): string {
  const category = SAFE_SEGMENT.test(categorySlug) ? categorySlug : "uncategorized";
  const ext = kind === "original" ? "jpg" : "webp";
  return `${PREFIX[kind]}/${category}/${sku}/${position}.${ext}`;
}

/** Guards presign requests: the key must belong to this sku and have the expected shape. */
export function isKeyForSku(key: string, sku: string): boolean {
  const m = key.match(/^(originals|cutout|web)\/([a-z0-9-]+)\/([A-Z]{2}-\d{4,})\/(\d{1,2})\.(jpg|webp)$/i);
  return !!m && m[3] === sku && (m[1] === "originals") === (m[5] === "jpg");
}

export const bucketForKind = (kind: ImageKind): "originals" | "media" =>
  kind === "original" ? "originals" : "media";
