import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/sale-enzo.xlsx.expected.json";
import { deterministicFields, isJunkRow, rowToUtterance, type LegacyRow } from "./xlsxRow";
import type { TaxonomyNode } from "@/lib/catalog/extract";

const SHORT = "00000000-0000-4000-8000-000000000002";
const LONG = "00000000-0000-4000-8000-000000000003";
const taxonomy: TaxonomyNode[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Polos",
    slug: "polos",
    children: [
      { id: SHORT, name: "Polos manga corta", slug: "polos-manga-corta" },
      { id: LONG, name: "Polos manga larga", slug: "polos-manga-larga" },
    ],
  },
];
const brands = ["Nike", "Under Armour", "The North Face", "Gymshark", "Puma"];
const subId = { "polos-manga-corta": SHORT, "polos-manga-larga": LONG } as Record<string, string>;

describe("SALE ENZO.xlsx deterministic mapping", () => {
  it.each(fixture.rows.map((r) => [r.excel_row, r] as const))("row %i", (_, { raw, expect: e }) => {
    const row = raw as LegacyRow;
    expect(isJunkRow(row)).toBe(false);

    const f = deterministicFields(row, { taxonomy, brands });
    expect(f.brand).toBe(e.brand);
    expect(f.subcategory_id).toBe(subId[e.subcategory_slug]);
    expect(f.size).toBe(e.size);
    expect(f.gender).toBe(e.gender);
    expect(f.also_unisex).toBe(e.also_unisex);
    expect(f.fit ?? null).toBe(e.fit);
    expect(f.fits_like_min ?? null).toBe(e.fits_like_min);
    expect(f.fits_like_max ?? null).toBe(e.fits_like_max);
    expect(f.condition_score).toBe(e.condition_score);
    expect(f.price).toBe(e.price);
    expect(f.compare_at_price).toBe(e.compare_at_price);
    expect(f.price_notes !== null).toBe(e.price_ambiguous);
  });

  it("skips the junk row", () => {
    expect(isJunkRow({ name: "eeee" })).toBe(true);
  });

  it("renders utterance without empty columns", () => {
    const u = rowToUtterance({ name: "Polo X", especificaciones: null, tela: " algodon " });
    expect(u).toBe("name: Polo X\ntela: algodon");
  });

  it("fixture groups: siblings share a product", () => {
    const groups = fixture.rows.map((r) => r.expect.group);
    const dup = groups.filter((g, i) => groups.indexOf(g) !== i);
    expect(dup).toEqual(["g07"]); // Dri-FIT manga larga negro + blanco
  });
});
