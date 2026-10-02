import { describe, expect, it } from "vitest";
import { computeMissingFields, EMPTY_DRAFT_FIELDS, MIN_DONE_IMAGES, REQUIRED_FIELDS } from "@/lib/catalog/schema";
import { parseStep, STEP_FIELDS, stepMissing, stepStatus, WIZARD_STEPS } from "./wizardSteps";

const mapped = Object.values(STEP_FIELDS).flat();

describe("STEP_FIELDS", () => {
  it("covers every field computeMissingFields can report, once", () => {
    const reportable = new Set<string>([...REQUIRED_FIELDS, "target_product_id", "target_variant_id", "metadata"]);
    for (const f of reportable) expect(mapped.filter((m) => m === f), f).toHaveLength(1);
    // and nothing outside what the draft can actually report
    const all = computeMissingFields({ ...EMPTY_DRAFT_FIELDS, match_kind: "new_item" });
    for (const f of all) expect(mapped).toContain(f);
  });
});

describe("stepMissing / stepStatus", () => {
  const missing = computeMissingFields(EMPTY_DRAFT_FIELDS);

  it("an empty draft is pending everywhere except review semantics", () => {
    for (const s of WIZARD_STEPS) expect(stepStatus(s.key, missing, 0)).toBe("pending");
  });

  it("photos step needs MIN_DONE_IMAGES processed photos", () => {
    expect(stepMissing("photos", [], MIN_DONE_IMAGES - 1)).toEqual(["Al menos 2 fotos procesadas"]);
    expect(stepMissing("photos", [], MIN_DONE_IMAGES)).toEqual([]);
  });

  it("dedupes the two category fields into one label", () => {
    expect(stepMissing("product", ["category_id", "subcategory_id"], 2)).toEqual(["Categoría"]);
  });

  it("review is ok only when every other step is ok", () => {
    expect(stepStatus("review", [], MIN_DONE_IMAGES)).toBe("ok");
    expect(stepStatus("review", ["price"], MIN_DONE_IMAGES)).toBe("pending");
  });
});

describe("parseStep", () => {
  it("accepts known keys only", () => {
    expect(parseStep("variant")).toBe("variant");
    expect(parseStep("nope")).toBeNull();
    expect(parseStep(null)).toBeNull();
  });
});
