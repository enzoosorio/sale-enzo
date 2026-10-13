import { describe, expect, it } from "vitest";
import { listingSlugs, productCanonicalPath, productsListingPath } from "./canonical";

const canonicalFor = (params: Record<string, string | string[] | undefined>) => {
  const { category, subcategory } = listingSlugs(params);
  return productsListingPath(category, subcategory);
};

describe("listing canonical", () => {
  it("keeps only category and subcategory", () => {
    expect(
      canonicalFor({
        category: "ropa",
        subcategory: "polos",
        color: ["azul", "negro"],
        size: "M",
        gender: "hombre",
        fit: "slim",
        page: "3",
      }),
    ).toBe("/products?category=ropa&subcategory=polos");
  });

  it("falls back to /products when only filters are present", () => {
    expect(canonicalFor({ color: "azul", page: "2" })).toBe("/products");
    expect(canonicalFor({})).toBe("/products");
  });

  it("drops a subcategory without its category", () => {
    expect(canonicalFor({ subcategory: "polos" })).toBe("/products");
  });

  it("normalizes case, whitespace and repeated params", () => {
    expect(canonicalFor({ category: [" Ropa ", "otra"] })).toBe("/products?category=ropa");
  });

  it("encodes slugs as query values", () => {
    expect(productsListingPath("a&b", "c d")).toBe("/products?category=a%26b&subcategory=c+d");
  });
});

describe("productCanonicalPath", () => {
  it("never includes the variant", () => {
    expect(productCanonicalPath("abc-123")).toBe("/products/abc-123");
  });
});
