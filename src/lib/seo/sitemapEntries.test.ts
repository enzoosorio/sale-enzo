import { describe, expect, it } from "vitest";
import { buildSitemapEntries, STATIC_PAGES, xmlEscape } from "./sitemapEntries";

const BASE = "https://example.test";
const categories = [
  { id: "c1", slug: "ropa", parentId: null },
  { id: "s1", slug: "polos", parentId: "c1" },
  { id: "s2", slug: "camisas", parentId: "c1" },
  { id: "c2", slug: "vacia", parentId: null },
];

describe("buildSitemapEntries", () => {
  const entries = buildSitemapEntries(BASE, categories, [
    { id: "p1", subcategoryId: "s1", updatedAt: "2026-10-01T00:00:00Z" },
    { id: "p2", subcategoryId: null, updatedAt: null },
  ]);
  const urls = entries.map((e) => e.url);

  it("lists static pages first with absolute urls", () => {
    expect(urls.slice(0, STATIC_PAGES.length)).toEqual(STATIC_PAGES.map((p) => `${BASE}${p}`));
  });

  it("adds listings only for categories that hold sellable products", () => {
    expect(urls).toContain(`${BASE}/products?category=ropa`);
    expect(urls).toContain(`${BASE}/products?category=ropa&amp;subcategory=polos`);
    expect(urls.some((u) => u.includes("camisas"))).toBe(false);
    expect(urls.some((u) => u.includes("vacia"))).toBe(false);
  });

  it("XML-escapes every url so the query string stays valid", () => {
    expect(urls.some((u) => /&(?!amp;)/.test(u))).toBe(false);
    expect(xmlEscape(`a&b<c>"d'`)).toBe("a&amp;b&lt;c&gt;&quot;d&apos;");
  });

  it("adds product pages without variant params", () => {
    const product = entries.find((e) => e.url === `${BASE}/products/p1`);
    expect(product?.lastModified).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(urls).toContain(`${BASE}/products/p2`);
    expect(urls.some((u) => u.includes("variant="))).toBe(false);
  });
});
