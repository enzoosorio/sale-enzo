import { describe, expect, it } from "vitest";
import { bucketForKind, imageKey, isKeyForSku } from "./keys";

describe("imageKey", () => {
  it("keeps the plain layout for original, cutout and web", () => {
    expect(imageKey("original", "polos", "SE-0007", 2)).toBe("originals/polos/SE-0007/2.jpg");
    expect(imageKey("cutout", "polos", "SE-0007", 2)).toBe("cutout/polos/SE-0007/2.webp");
    expect(imageKey("web", "weird slug!", "SE-0007", 2)).toBe("web/uncategorized/SE-0007/2.webp");
  });

  it("versions the ironed renditions so a regeneration never reuses an immutable-cached key", () => {
    expect(imageKey("ironed", "polos", "SE-0007", 2, 1)).toBe("ironed/polos/SE-0007/2-v1.webp");
    expect(imageKey("ironed-web", "polos", "SE-0007", 2, 3)).toBe("ironed-web/polos/SE-0007/2-v3.webp");
    expect(() => imageKey("ironed", "polos", "SE-0007", 2)).toThrow();
    expect(() => imageKey("ironed-web", "polos", "SE-0007", 2, 0)).toThrow();
  });
});

describe("isKeyForSku", () => {
  it("accepts every layout for the right sku", () => {
    for (const key of [
      "originals/polos/SE-0007/2.jpg",
      "cutout/polos/SE-0007/2.webp",
      "web/polos/SE-0007/2.webp",
      "ironed/polos/SE-0007/2-v1.webp",
      "ironed-web/polos/SE-0007/12-v2.webp",
    ]) {
      expect(isKeyForSku(key, "SE-0007"), key).toBe(true);
    }
  });

  it("rejects other skus, wrong extensions and missing or stray versions", () => {
    expect(isKeyForSku("web/polos/SE-0008/2.webp", "SE-0007")).toBe(false);
    expect(isKeyForSku("originals/polos/SE-0007/2.webp", "SE-0007")).toBe(false);
    expect(isKeyForSku("ironed/polos/SE-0007/2.webp", "SE-0007")).toBe(false);
    expect(isKeyForSku("web/polos/SE-0007/2-v1.webp", "SE-0007")).toBe(false);
  });
});

describe("bucketForKind", () => {
  it("only the original is private", () => {
    expect(bucketForKind("original")).toBe("originals");
    expect(bucketForKind("ironed")).toBe("media");
  });
});
