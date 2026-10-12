import { describe, expect, it } from "vitest";
import {
  availabilityFromItems,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  serializeJsonLd,
} from "./jsonLd";

const BASE = "https://example.test";

describe("availabilityFromItems", () => {
  it("is InStock when any item is available with stock", () => {
    expect(
      availabilityFromItems([
        { status: "sold", stock: 0 },
        { status: "available", stock: 1 },
      ]),
    ).toBe("https://schema.org/InStock");
  });

  it("treats a missing status with stock as available", () => {
    expect(availabilityFromItems([{ status: null, stock: 1 }])).toBe("https://schema.org/InStock");
  });

  it("is OutOfStock when the only units are reserved", () => {
    expect(availabilityFromItems([{ status: "reserved", stock: 1 }])).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("is SoldOut when nothing has stock or no items exist", () => {
    expect(availabilityFromItems([{ status: "available", stock: 0 }])).toBe("https://schema.org/SoldOut");
    expect(availabilityFromItems([{ status: "sold", stock: 1 }])).toBe("https://schema.org/SoldOut");
    expect(availabilityFromItems([])).toBe("https://schema.org/SoldOut");
  });
});

describe("buildProductJsonLd", () => {
  const product = buildProductJsonLd(
    {
      id: "p1",
      name: "Polo azul",
      description: "Algodón pima",
      brand: "Lacoste",
      sku: "SKU-1",
      price: 45,
      images: ["/images/a.png", "https://cdn.example.com/b.webp"],
      items: [{ status: "available", stock: 1 }],
      url: "/products/p1",
    },
    BASE,
  );

  it("builds a used-condition offer in soles", () => {
    expect(product["@type"]).toBe("Product");
    expect(product.itemCondition).toBe("https://schema.org/UsedCondition");
    expect(product.offers).toEqual({
      "@type": "Offer",
      url: `${BASE}/products/p1`,
      price: "45.00",
      priceCurrency: "PEN",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
    });
    expect(product.brand).toEqual({ "@type": "Brand", name: "Lacoste" });
  });

  it("makes the url and every image absolute", () => {
    expect(product.url).toBe(`${BASE}/products/p1`);
    expect(product.image).toEqual([`${BASE}/images/a.png`, "https://cdn.example.com/b.webp"]);
  });

  it("omits empty optional fields", () => {
    const bare = buildProductJsonLd(
      { id: "p2", name: "Casaca", price: 10, images: [], items: [], url: "/products/p2" },
      BASE,
    );
    expect(bare).not.toHaveProperty("brand");
    expect(bare).not.toHaveProperty("description");
    expect(bare).not.toHaveProperty("sku");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("numbers crumbs from 1 with absolute urls", () => {
    const crumbs = buildBreadcrumbJsonLd(
      [
        { name: "Inicio", path: "/home" },
        { name: "Ropa", path: "/products?category=ropa" },
        { name: "Polos", path: "/products?category=ropa&subcategory=polos" },
        { name: "Polo azul", path: "/products/p1" },
      ],
      BASE,
    );
    expect(crumbs.itemListElement.map((c) => [c.position, c.item])).toEqual([
      [1, `${BASE}/home`],
      [2, `${BASE}/products?category=ropa`],
      [3, `${BASE}/products?category=ropa&subcategory=polos`],
      [4, `${BASE}/products/p1`],
    ]);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a value cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  it("escapes > and & too", () => {
    const out = serializeJsonLd({ text: "<!-- a & b -->" });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual({ text: "<!-- a & b -->" });
  });
});
