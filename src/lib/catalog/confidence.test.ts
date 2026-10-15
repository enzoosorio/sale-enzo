import { describe, expect, it } from "vitest";
import { applyAiFields, legacyConfidenceKey } from "./confidence";

/** Optional so each test can pass only the fields it cares about. */
type TestFields = {
  price?: number | null;
  size?: string | null;
  brand?: string | null;
  tags?: string[];
  metadata?: Record<string, string>;
};

describe("applyAiFields", () => {
  it("autofills at and above the autofill threshold (0.80)", () => {
    const res = applyAiFields<TestFields>({
      current: { price: null, size: null },
      fieldSource: {},
      ai: { price: 39, size: "M" },
      confidence: { price: 0.8, size: 0.95 },
    });
    expect(res.patch).toEqual({ price: 39, size: "M" });
    expect(res.autofilled).toEqual(["price", "size"]);
    expect(res.suggested).toEqual([]);
    expect(res.dropped).toEqual([]);
    expect(res.nextFieldSource).toEqual({ price: "ai", size: "ai" });
  });

  it("suggests between suggest and autofill thresholds, 0.45 inclusive", () => {
    const res = applyAiFields<TestFields>({
      current: { price: null, size: null, brand: null },
      fieldSource: {},
      ai: { price: 10, size: "M", brand: "Nike" },
      confidence: { price: 0.45, size: 0.6, brand: 0.4499 },
    });
    expect(res.patch).toEqual({ price: 10, size: "M" });
    expect(res.suggested).toEqual(["price", "size"]);
    expect(res.dropped).toEqual(["brand"]);
    expect(res.nextFieldSource.price).toBe("ai");
    expect(res.nextFieldSource.brand).toBeUndefined();
  });

  it("never overwrites a user-sourced value that is already set", () => {
    const res = applyAiFields<TestFields>({
      current: { price: 55 },
      fieldSource: { price: "user" },
      ai: { price: 39 },
      confidence: { price: 0.99 },
    });
    expect(res.patch).toEqual({});
    expect(res.autofilled).toEqual([]);
    expect(res.dropped).toEqual([]);
    expect(res.nextFieldSource.price).toBe("user");
  });

  it("can fill a user-sourced field whose value is still empty", () => {
    const res = applyAiFields<TestFields>({
      current: { price: null },
      fieldSource: { price: "user" },
      ai: { price: 39 },
      confidence: { price: 0.9 },
    });
    expect(res.patch).toEqual({ price: 39 });
    expect(res.autofilled).toEqual(["price"]);
    expect(res.nextFieldSource.price).toBe("ai");
  });

  it("null AI values do not erase current values", () => {
    const res = applyAiFields<TestFields>({
      current: { price: 39 },
      fieldSource: { price: "ai" },
      ai: { price: null },
      confidence: { price: 0.9 },
    });
    expect(res.patch).toEqual({});
    expect(res.autofilled).toEqual([]);
    expect(res.nextFieldSource.price).toBe("ai");
  });

  it("empty arrays and objects are skipped", () => {
    const res = applyAiFields<TestFields>({
      current: { tags: ["nike"], metadata: { team: "Bulls" } },
      fieldSource: {},
      ai: { tags: [], metadata: {} },
      confidence: { tags: 0.9, metadata: 0.9 },
    });
    expect(res.patch).toEqual({});
    expect(res.autofilled).toEqual([]);
    expect(res.dropped).toEqual([]);
  });

  it("keys without a confidence entry are treated as 0 and dropped", () => {
    const res = applyAiFields<TestFields>({
      current: { brand: null },
      fieldSource: {},
      ai: { brand: "Nike" },
      confidence: {},
    });
    expect(res.patch).toEqual({});
    expect(res.dropped).toEqual(["brand"]);
    expect(res.nextFieldSource.brand).toBeUndefined();
  });

  it("merges nextFieldSource, keeping sources of untouched keys", () => {
    const res = applyAiFields<TestFields>({
      current: { size: "M", brand: null },
      fieldSource: { size: "user" },
      ai: { brand: "Nike" },
      confidence: { brand: 0.95 },
    });
    expect(res.nextFieldSource).toEqual({ size: "user", brand: "ai" });
  });

  it("keeps a previously user-sourced key untouched even when the AI agrees with it", () => {
    const res = applyAiFields<TestFields>({
      current: { size: "M", brand: "Nike" },
      fieldSource: { size: "user" },
      ai: { size: "M", brand: "Nike" },
      confidence: { size: 0.99, brand: 0.99 },
    });
    expect(res.patch).toEqual({ brand: "Nike" });
    expect(res.nextFieldSource).toEqual({ size: "user", brand: "ai" });
  });
});

describe("legacyConfidenceKey", () => {
  it("maps draft keys to the coarse keys the voice model reports", () => {
    expect(legacyConfidenceKey("subcategory_id")).toBe("subcategory");
    expect(legacyConfidenceKey("category_id")).toBe("category");
    expect(legacyConfidenceKey("condition_score")).toBe("condition_score");
    expect(legacyConfidenceKey("brand")).toBe("brand");
  });
});
