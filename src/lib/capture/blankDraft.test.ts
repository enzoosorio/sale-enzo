import { describe, expect, it } from "vitest";
import { MIN_DONE_IMAGES } from "@/lib/catalog/schema";
import { blankDraft, isSaved } from "./blankDraft";
import { stepStatus, WIZARD_STEPS } from "./wizardSteps";

describe("blankDraft", () => {
  it("is not saved: nothing exists in the database yet", () => {
    expect(isSaved(blankDraft())).toBe(false);
    expect(isSaved({ id: "3f1c" })).toBe(true);
  });

  it("starts as a new product and reports its missing fields, so no step looks complete", () => {
    const d = blankDraft();
    expect(d.match_kind).toBe("new_product");
    expect(d.missing_fields).toEqual(expect.arrayContaining(["name", "brand", "price", "metadata"]));
    for (const s of WIZARD_STEPS.filter((s) => s.key !== "review")) {
      expect(stepStatus(s.key, d.missing_fields, 0), s.key).toBe("pending");
    }
    expect(d.images).toHaveLength(0);
    expect(MIN_DONE_IMAGES).toBeGreaterThan(0);
  });
});
