import { describe, expect, it } from "vitest";
import { compareIroned } from "./ironCheck";

const base = { width: 1000, height: 1200, colors: ["#c81e1e", "#ffffff", "#111111"] };

describe("compareIroned", () => {
  it("accepts a faithful retouch (tiny size and tone changes)", () => {
    const res = compareIroned(base, { width: 1010, height: 1195, colors: ["#c52020", "#fefefe", "#141414"] });
    expect(res.verdict).toBe("ok");
    expect(res.reasons).toEqual([]);
  });

  it("flags a changed silhouette", () => {
    const res = compareIroned(base, { width: 1000, height: 1050, colors: base.colors });
    expect(res.verdict).toBe("suspect");
    expect(res.reasons).toEqual(["aspect"]);
    expect(compareIroned(base, { width: 1000, height: 800, colors: base.colors }).verdict).toBe("failed");
  });

  it("flags a color that did not exist before", () => {
    const res = compareIroned(base, { ...base, colors: ["#c81e1e", "#1e5bc8"] });
    expect(res.verdict).toBe("failed");
    expect(res.reasons).toContain("palette");
    expect(res.paletteShift).toBeGreaterThan(0.22);
  });

  it("carries the verdict of the ironed cutout's own quality gate", () => {
    const res = compareIroned(base, base, "suspect");
    expect(res.verdict).toBe("suspect");
    expect(res.reasons).toEqual(["cutout"]);
    expect(compareIroned(base, base, "failed").verdict).toBe("failed");
  });

  it("does not fail when a palette is missing", () => {
    expect(compareIroned({ ...base, colors: [] }, base).verdict).toBe("ok");
  });
});
