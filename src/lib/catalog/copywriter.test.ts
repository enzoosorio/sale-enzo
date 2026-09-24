import { describe, expect, it } from "vitest";
import { auditCopy, buildCopyPrompt, type CopyInput } from "./copywriter";

const input: CopyInput = {
  name: "Polo Nike New York Voit 69",
  brand: "Nike",
  size: "S",
  gender: "male",
  also_unisex: false,
  fit: "regular",
  fits_like_min: null,
  fits_like_max: null,
  metadata: { team: "New York", player: "Voit" },
  condition_score: 9,
  specs_raw: null,
  defects: [{ type: "hole", zone: "manga", severity: "minimal", note: "huequito" }],
};

describe("copywriter", () => {
  it("prompt carries every defect to the model", () => {
    expect(buildCopyPrompt(input)).toContain("hole en manga (mínimo): huequito");
  });

  it("flags alarmist words", () => {
    const issues = auditCopy({ description: "Polo Nike.", condition_note: "Tiene un hueco en la manga." }, input);
    expect(issues).toContain("Usa palabras alarmistas");
  });

  it("flags overclaiming when there are defects", () => {
    const issues = auditCopy({ description: "Polo Nike.", condition_note: "Impecable, listo para usar ya mismo." }, input);
    expect(issues).toContain("Exagera el estado pese a tener defectos");
  });

  it("accepts a tactful disclosure", () => {
    const issues = auditCopy(
      { description: "Polo Nike de los Yankees.", condition_note: "Muy buen estado, con un detalle mínimo en una manga casi imperceptible." },
      input,
    );
    expect(issues).toEqual([]);
  });
});
