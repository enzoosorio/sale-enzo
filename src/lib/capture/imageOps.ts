/**
 * Pixel helpers for the capture worker. Pure functions over RGBA buffers so
 * they can be unit-tested without a canvas.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding box of pixels with alpha > threshold, padded by `padRatio` of the longest side. */
export function alphaBoundingBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 8,
  padRatio = 0.04,
): Box | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * padRatio);
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return {
    x,
    y,
    width: Math.min(width, maxX + pad + 1) - x,
    height: Math.min(height, maxY + pad + 1) - y,
  };
}

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * Dominant colors via k-means over opaque pixels (alpha > 200).
 * Returns hex colors ordered by cluster size; clusters under `minShare` are dropped.
 * Deterministic: centroids are seeded from evenly spaced samples.
 */
export function dominantColors(data: Uint8ClampedArray, k = 4, iterations = 12, minShare = 0.05): string[] {
  const pixels: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  const clusters = Math.min(k, pixels.length);
  let centroids = Array.from({ length: clusters }, (_, c) => [
    ...pixels[Math.floor(((c + 0.5) * pixels.length) / clusters)],
  ]);
  const assignment = new Int32Array(pixels.length);

  for (let it = 0; it < iterations; it++) {
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let p = 0; p < pixels.length; p++) {
      const [r, g, b] = pixels[p];
      let best = 0, bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const [cr, cg, cb] = centroids[c];
        const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (d < bestDist) { bestDist = d; best = c; }
      }
      assignment[p] = best;
      sums[best][0] += r; sums[best][1] += g; sums[best][2] += b; sums[best][3]++;
    }
    centroids = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centroids[c]));
  }

  const counts = new Array(centroids.length).fill(0);
  for (const a of assignment) counts[a]++;

  return centroids
    .map((c, i) => ({ hex: toHex(c[0], c[1], c[2]), share: counts[i] / pixels.length }))
    .filter((c) => c.share >= minShare)
    .sort((a, b) => b.share - a.share)
    .map((c) => c.hex)
    .filter((hex, i, all) => all.indexOf(hex) === i);
}

// ---------------------------------------------------------------------------
// Cutout quality gate
// ---------------------------------------------------------------------------

export type CutoutVerdict = "ok" | "suspect" | "failed";

export type CutoutReason =
  | "empty" // nothing survived the mask
  | "tiny" // the garment is a speck: model lost it
  | "nothing_removed" // practically the whole frame is opaque: background kept
  | "mostly_kept" // most of the frame is opaque: background probably still there
  | "touches_edges" // opaque on 3+ frame edges while filling most of the frame
  | "fragmented" // leftover blobs besides the (at most two) main pieces
  | "soft_mask"; // lots of half-transparent pixels: ghosting/shadow

export interface CutoutQuality {
  verdict: CutoutVerdict;
  reasons: CutoutReason[];
  /** Opaque (alpha > 128) share of the frame, 0-1. */
  coverage: number;
  /** Area of the alpha > 8 bounding box over the frame area, 0-1. */
  bboxRatio: number;
  /** How many of the 4 frame edges carry opaque pixels (>2% of their length). */
  edgeTouch: number;
  /** Half-transparent share among all visible pixels, 0-1. */
  softAlphaRatio: number;
  /** Opaque connected components, and the share of area outside the two largest. */
  components: number;
  strayShare: number;
}

const VERDICT_RANK: Record<CutoutVerdict, number> = { ok: 0, suspect: 1, failed: 2 };

/** True when `a` is a strictly better cutout than `b` (used to pick among provider attempts). */
export const betterVerdict = (a: CutoutVerdict, b: CutoutVerdict): boolean => VERDICT_RANK[a] < VERDICT_RANK[b];

const SOLID_ALPHA = 128;
const VISIBLE_ALPHA = 8;
const SOFT_MAX_ALPHA = 245;

/**
 * Cheap sanity check of a background-removal result, run on a thumbnail
 * (<= ~512 px) of the cutout. It can't prove a cutout is good, but it catches
 * the failures that used to be saved as successes: an empty mask, a model that
 * removed nothing, a lost garment, leftover blobs and ghosted masks.
 */
export function assessCutout(data: Uint8ClampedArray, width: number, height: number): CutoutQuality {
  const total = width * height;
  const solid = new Uint8Array(total);
  let solidCount = 0;
  let visibleCount = 0;
  let softCount = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let i = 0; i < total; i++) {
    const a = data[i * 4 + 3];
    if (a > VISIBLE_ALPHA) {
      visibleCount++;
      if (a < SOFT_MAX_ALPHA) softCount++;
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (a > SOLID_ALPHA) {
      solid[i] = 1;
      solidCount++;
    }
  }

  if (visibleCount === 0) {
    return { verdict: "failed", reasons: ["empty"], coverage: 0, bboxRatio: 0, edgeTouch: 0, softAlphaRatio: 0, components: 0, strayShare: 0 };
  }

  const coverage = solidCount / total;
  const bboxRatio = ((maxX - minX + 1) * (maxY - minY + 1)) / total;
  const softAlphaRatio = softCount / visibleCount;

  // Edge contact: an edge "touches" when >2% of its pixels are opaque.
  const edgeShare = (pixels: number[]) => pixels.reduce((n, i) => n + solid[i], 0) / pixels.length;
  const topEdge = Array.from({ length: width }, (_, x) => x);
  const bottomEdge = Array.from({ length: width }, (_, x) => (height - 1) * width + x);
  const leftEdge = Array.from({ length: height }, (_, y) => y * width);
  const rightEdge = Array.from({ length: height }, (_, y) => y * width + width - 1);
  const edgeTouch = [topEdge, bottomEdge, leftEdge, rightEdge].filter((edge) => edgeShare(edge) > 0.02).length;

  // Connected components of the opaque mask (4-neighbourhood, iterative flood fill).
  const sizes: number[] = [];
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  for (let start = 0; start < total; start++) {
    if (!solid[start] || seen[start]) continue;
    let size = 0;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % width;
      if (x > 0 && solid[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < width - 1 && solid[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (p >= width && solid[p - width] && !seen[p - width]) { seen[p - width] = 1; stack[top++] = p - width; }
      if (p < total - width && solid[p + width] && !seen[p + width]) { seen[p + width] = 1; stack[top++] = p + width; }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  // A pair of shoes is two big pieces; everything beyond the two largest is a leftover.
  const strayShare = solidCount > 0 ? sizes.slice(2).reduce((n, s) => n + s, 0) / solidCount : 0;

  const reasons: CutoutReason[] = [];
  let verdict: CutoutVerdict = "ok";
  const flag = (level: CutoutVerdict, reason: CutoutReason) => {
    reasons.push(reason);
    if (VERDICT_RANK[level] > VERDICT_RANK[verdict]) verdict = level;
  };

  if (coverage < 0.02) flag("failed", "tiny");
  else if (coverage < 0.06) flag("suspect", "tiny");
  if (coverage >= 0.985) flag("failed", "nothing_removed");
  else if (coverage > 0.92) flag("suspect", "mostly_kept");
  if (edgeTouch >= 3 && coverage > 0.8) flag("suspect", "touches_edges");
  if (strayShare > 0.08) flag("suspect", "fragmented");
  if (softAlphaRatio > 0.25) flag("suspect", "soft_mask");

  return { verdict, reasons, coverage, bboxRatio, edgeTouch, softAlphaRatio, components: sizes.length, strayShare };
}
