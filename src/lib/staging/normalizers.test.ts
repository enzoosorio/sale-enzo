import { describe, expect, it } from "vitest";
import {
  matchBrand,
  normalizeCondition,
  normalizeFitColumn,
  normalizeGender,
  normalizePrice,
  normalizeSize,
  normalizeSlug,
} from "./normalizers";

// Cases taken verbatim from SALE ENZO.xlsx
describe("normalizeGender", () => {
  it.each([
    ["Male unisex", "male", true],
    ["male - unisex", "male", true],
    ["male unisex", "male", true],
    ["Male", "male", false],
    ["unisex", "unisex", false],
    ["female", "female", false],
    ["", null, false],
  ])("%s", (raw, gender, alsoUnisex) => {
    expect(normalizeGender(raw)).toEqual({ gender, also_unisex: alsoUnisex });
  });
});

describe("normalizeFitColumn", () => {
  it("separates fit from fits-like sizes", () => {
    expect(normalizeFitColumn("Slim (S)")).toEqual({ fit: "slim", fits_like_min: "S", fits_like_max: "S" });
    expect(normalizeFitColumn("regular")).toEqual({ fit: "regular", fits_like_min: null, fits_like_max: null });
    expect(normalizeFitColumn("size XS - S")).toEqual({ fit: null, fits_like_min: "XS", fits_like_max: "S" });
    expect(normalizeFitColumn("M - L")).toEqual({ fit: null, fits_like_min: "M", fits_like_max: "L" });
    expect(normalizeFitColumn("L ")).toEqual({ fit: null, fits_like_min: "L", fits_like_max: "L" });
  });
});

describe("normalizeCondition", () => {
  it.each([
    ["10/10", 10],
    ["8.5/10", 8.5],
    ["9.5/10", 9.5],
    ["8/10", 8],
    ["abc", null],
  ])("%s", (raw, expected) => expect(normalizeCondition(raw)).toBe(expected));
});

describe("normalizePrice", () => {
  it("plain number", () => {
    expect(normalizePrice(59)).toEqual({ price: 59, compare_at_price: null, price_notes: null });
  });
  it("discount phrase", () => {
    expect(normalizePrice("69 pero dcto a 59")).toEqual({ price: 59, compare_at_price: 69, price_notes: null });
  });
  it("ambiguous options stay for the owner", () => {
    expect(normalizePrice("69 o 79")).toEqual({ price: null, compare_at_price: null, price_notes: "69 o 79" });
    expect(normalizePrice("59 o 65 o 69").price).toBeNull();
  });
});

describe("normalizeSize / slug / brand", () => {
  it("sizes", () => {
    expect(normalizeSize("m")).toBe("M");
    expect(normalizeSize("size XS")).toBe("XS");
    expect(normalizeSize("XXXXL")).toBeNull();
  });
  it("subcategory slugs converge", () => {
    for (const raw of ["Polos manga corta", "Polo manga corta", "polo manga corta"]) {
      expect(normalizeSlug(raw)).toBe("polos-manga-corta");
    }
  });
  it("brand casing", () => {
    const brands = ["Nike", "Under Armour", "The North Face", "Gymshark", "Puma"];
    expect(matchBrand("Under armour", brands)).toBe("Under Armour");
    expect(matchBrand("The north face", brands)).toBe("The North Face");
    expect(matchBrand("Adidas", brands)).toBeNull();
  });
});
