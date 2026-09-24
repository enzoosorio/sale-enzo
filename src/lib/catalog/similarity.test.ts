import { describe, expect, it } from "vitest";
import { ATTACH_MIN_SIMILARITY, designSimilarity, PROMOTE_MIN_SIMILARITY } from "./similarity";

// Names as produced by the extraction on SALE ENZO.xlsx
describe("designSimilarity", () => {
  it("color siblings are the same design", () => {
    const sim = designSimilarity("Polo Nike Dri-FIT manga larga negro humo", "Polo Nike Dri-FIT manga larga blanco humo", "Nike");
    expect(sim).toBeGreaterThanOrEqual(PROMOTE_MIN_SIMILARITY);
  });

  it("different teams/universities never attach", () => {
    expect(designSimilarity("Polo Nike Team USA azul marino", "Polo Nike Boston University BU verde camo", "Nike")).toBeLessThan(ATTACH_MIN_SIMILARITY);
    expect(designSimilarity("Polo Under Armour color sand grisáceo blanco", "Polo Under Armour deportivo gris", "Under Armour")).toBeLessThan(ATTACH_MIN_SIMILARITY);
  });

  it("near-generic names stay below auto-promotion", () => {
    const sim = designSimilarity("Polo Nike Dri-FIT gris plomo", "Polo Nike Dri-FIT gris textura plomo", "Nike");
    expect(sim).toBeLessThan(PROMOTE_MIN_SIMILARITY);
  });

  it("names made only of colors never match", () => {
    expect(designSimilarity("Polo Nike gris", "Polo Nike negro", "Nike")).toBe(0);
  });
});
