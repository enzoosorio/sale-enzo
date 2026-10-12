import { describe, expect, it } from "vitest";
import { absoluteUrl, DEFAULT_SITE_URL, siteUrl } from "./site";

describe("siteUrl", () => {
  it("falls back to the production URL when unset or invalid", () => {
    expect(siteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(siteUrl("not a url")).toBe(DEFAULT_SITE_URL);
    expect(siteUrl("ftp://example.com")).toBe(DEFAULT_SITE_URL);
  });

  it("keeps only the origin", () => {
    expect(siteUrl("https://example.com/some/path/")).toBe("https://example.com");
    expect(siteUrl(" http://localhost:3000 ")).toBe("http://localhost:3000");
  });
});

describe("absoluteUrl", () => {
  it("resolves paths against the base and keeps absolute URLs", () => {
    expect(absoluteUrl("/products?category=ropa", "https://example.com")).toBe(
      "https://example.com/products?category=ropa",
    );
    expect(absoluteUrl("https://cdn.example.com/a.png", "https://example.com")).toBe(
      "https://cdn.example.com/a.png",
    );
  });
});
