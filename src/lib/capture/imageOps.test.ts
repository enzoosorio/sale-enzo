import { describe, expect, it } from "vitest";
import { alphaBoundingBox, assessCutout, betterVerdict, dominantColors, fitWithin } from "./imageOps";

function image(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  return data;
}

describe("alphaBoundingBox", () => {
  it("crops to opaque content", () => {
    const data = image(100, 100, (x, y) => (x >= 20 && x < 60 && y >= 30 && y < 90 ? [255, 0, 0, 255] : [0, 0, 0, 0]));
    expect(alphaBoundingBox(data, 100, 100, 8, 0)).toEqual({ x: 20, y: 30, width: 40, height: 60 });
  });

  it("returns null on fully transparent images", () => {
    expect(alphaBoundingBox(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});

describe("fitWithin", () => {
  it("never upscales", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  });
});

describe("dominantColors", () => {
  it("orders by share and ignores transparent pixels", () => {
    const data = image(10, 10, (x) =>
      x < 7 ? [255, 102, 0, 255] : x < 9 ? [0, 0, 128, 255] : [0, 255, 0, 0],
    );
    expect(dominantColors(data, 3)).toEqual(["#ff6600", "#000080"]);
  });
});

describe("assessCutout", () => {
  const W = 100;
  const H = 100;
  const solidRect = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number): [number, number, number, number] =>
    x >= x0 && x < x1 && y >= y0 && y < y1 ? [200, 30, 30, 255] : [0, 0, 0, 0];

  it("accepts a centered garment", () => {
    const q = assessCutout(image(W, H, solidRect(25, 15, 75, 85)), W, H);
    expect(q.verdict).toBe("ok");
    expect(q.reasons).toEqual([]);
    expect(q.components).toBe(1);
    expect(q.edgeTouch).toBe(0);
  });

  it("fails an empty mask", () => {
    const q = assessCutout(new Uint8ClampedArray(W * H * 4), W, H);
    expect(q.verdict).toBe("failed");
    expect(q.reasons).toEqual(["empty"]);
  });

  it("fails when nothing was removed", () => {
    const q = assessCutout(image(W, H, () => [10, 10, 10, 255]), W, H);
    expect(q.verdict).toBe("failed");
    expect(q.reasons).toContain("nothing_removed");
  });

  it("flags a lost garment as tiny", () => {
    expect(assessCutout(image(W, H, solidRect(48, 48, 52, 52)), W, H).verdict).toBe("failed"); // 0.16% of the frame
    const small = assessCutout(image(W, H, solidRect(40, 40, 52, 52)), W, H); // 1.4%... still under 2%
    expect(small.verdict).toBe("failed");
    const edgy = assessCutout(image(W, H, solidRect(40, 40, 58, 58)), W, H); // 3.2%: suspect
    expect(edgy.verdict).toBe("suspect");
    expect(edgy.reasons).toContain("tiny");
    expect(assessCutout(image(W, H, solidRect(35, 35, 65, 65)), W, H).reasons).toEqual([]); // 9%
  });

  it("flags a mostly-kept background", () => {
    const nearlyAll = assessCutout(image(W, H, (x, y) => (x < 4 && y < 4 ? [0, 0, 0, 0] : [9, 9, 9, 255])), W, H);
    expect(nearlyAll.verdict).toBe("failed"); // 99.8% opaque
    const mostly = assessCutout(image(W, H, (x) => (x < 6 ? [0, 0, 0, 0] : [9, 9, 9, 255])), W, H); // 94% opaque
    expect(mostly.verdict).toBe("suspect");
    expect(mostly.reasons).toContain("mostly_kept");
  });

  it("allows a pair of pieces but flags leftover blobs", () => {
    const pair = (x: number, y: number): [number, number, number, number] =>
      (x >= 10 && x < 40 && y >= 30 && y < 70) || (x >= 60 && x < 90 && y >= 30 && y < 70) ? [1, 1, 1, 255] : [0, 0, 0, 0];
    expect(assessCutout(image(W, H, pair), W, H).verdict).toBe("ok");

    const withBlobs = (x: number, y: number): [number, number, number, number] =>
      pair(x, y)[3] ||
      (x >= 45 && x < 55 && y >= 2 && y < 12) ||
      (x >= 45 && x < 55 && y >= 88 && y < 98) ||
      (x >= 2 && x < 12 && y >= 2 && y < 12)
        ? [1, 1, 1, 255]
        : [0, 0, 0, 0];
    const q = assessCutout(image(W, H, withBlobs), W, H);
    expect(q.reasons).toContain("fragmented");
    expect(q.verdict).toBe("suspect");
  });

  it("flags a ghosted, half-transparent mask", () => {
    const q = assessCutout(image(W, H, (x, y) => (x >= 20 && x < 80 && y >= 20 && y < 80 ? [5, 5, 5, x < 50 ? 255 : 120] : [0, 0, 0, 0])), W, H);
    expect(q.reasons).toContain("soft_mask");
  });
});

describe("betterVerdict", () => {
  it("orders ok < suspect < failed", () => {
    expect(betterVerdict("ok", "suspect")).toBe(true);
    expect(betterVerdict("suspect", "failed")).toBe(true);
    expect(betterVerdict("suspect", "suspect")).toBe(false);
  });
});
