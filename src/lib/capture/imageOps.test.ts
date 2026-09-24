import { describe, expect, it } from "vitest";
import { alphaBoundingBox, dominantColors, fitWithin } from "./imageOps";

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
