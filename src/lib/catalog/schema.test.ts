import { describe, expect, it } from "vitest";
import {
  computeMissingFields,
  ConditionScoreSchema,
  DraftFieldsSchema,
  EMPTY_DRAFT_FIELDS,
  REQUIRED_FIELDS,
} from "./schema";

describe("DraftFieldsSchema", () => {
  it("accepts the empty draft", () => {
    expect(DraftFieldsSchema.parse(EMPTY_DRAFT_FIELDS)).toEqual(EMPTY_DRAFT_FIELDS);
  });

  it("rejects values outside closed enums", () => {
    expect(DraftFieldsSchema.safeParse({ ...EMPTY_DRAFT_FIELDS, gender: "Male unisex" }).success).toBe(false);
    expect(DraftFieldsSchema.safeParse({ ...EMPTY_DRAFT_FIELDS, size: "XXXXL" }).success).toBe(false);
    expect(
      DraftFieldsSchema.safeParse({ ...EMPTY_DRAFT_FIELDS, metadata: { color: "red" } }).success,
    ).toBe(false);
  });

  it("condition uses 0.5 steps", () => {
    expect(ConditionScoreSchema.safeParse(8.5).success).toBe(true);
    expect(ConditionScoreSchema.safeParse(8.3).success).toBe(false);
  });
});

describe("computeMissingFields", () => {
  it("lists all required fields plus metadata on an empty draft", () => {
    expect(computeMissingFields(EMPTY_DRAFT_FIELDS)).toEqual([...REQUIRED_FIELDS, "metadata"]);
  });

  it("requires a target for variant/item matches", () => {
    const d = { ...EMPTY_DRAFT_FIELDS, match_kind: "new_variant" as const };
    expect(computeMissingFields(d)).toContain("target_product_id");
  });
});
