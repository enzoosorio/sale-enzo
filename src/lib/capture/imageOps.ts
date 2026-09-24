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
