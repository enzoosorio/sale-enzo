import { describe, expect, it } from "vitest";
import { isSellableItem, toHomeProductCards, type HomeItemRow, type HomeProductRow } from "./homeProducts";

const item = (overrides: Partial<HomeItemRow> = {}): HomeItemRow => ({
  id: "item-1",
  price: "49.90",
  compare_at_price: null,
  stock: 1,
  status: "available",
  ...overrides,
});

const product = (overrides: Partial<HomeProductRow> = {}): HomeProductRow => ({
  id: "p-1",
  name: "Polo piqué azul",
  brand: "Lacoste",
  is_active: true,
  created_at: "2026-10-01T10:00:00Z",
  product_variants: [{ id: "v-1", main_img_url: "https://media.example.com/a.webp", product_items: [item()] }],
  ...overrides,
});

describe("isSellableItem", () => {
  it("accepts available and reserved units with stock", () => {
    expect(isSellableItem(item())).toBe(true);
    expect(isSellableItem(item({ status: "reserved" }))).toBe(true);
    expect(isSellableItem(item({ status: null }))).toBe(true);
  });

  it("rejects sold, hidden or out-of-stock units", () => {
    expect(isSellableItem(item({ status: "sold" }))).toBe(false);
    expect(isSellableItem(item({ status: "hidden" }))).toBe(false);
    expect(isSellableItem(item({ stock: 0 }))).toBe(false);
    expect(isSellableItem(item({ stock: null }))).toBe(false);
  });
});

describe("toHomeProductCards", () => {
  it("maps a sellable product to a card with a numeric price", () => {
    expect(toHomeProductCards([product()])).toEqual([
      {
        id: "p-1",
        name: "Polo piqué azul",
        brand: "Lacoste",
        price: 49.9,
        compareAtPrice: null,
        imageUrl: "https://media.example.com/a.webp",
      },
    ]);
  });

  it("orders newest first and keeps one card per product", () => {
    const cards = toHomeProductCards([
      product({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
      product({ id: "new", created_at: "2026-09-01T00:00:00Z" }),
      product({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(["new", "old"]);
  });

  it("drops inactive products and products with nothing to sell", () => {
    const cards = toHomeProductCards([
      product({ id: "inactive", is_active: false }),
      product({ id: "sold", product_variants: [{ id: "v", main_img_url: null, product_items: [item({ status: "sold" })] }] }),
      product({ id: "empty", product_variants: [] }),
      product({ id: "null-variants", product_variants: null }),
    ]);
    expect(cards).toEqual([]);
  });

  it("shows the cheapest sellable unit, preferring a variant with a photo", () => {
    const [card] = toHomeProductCards([
      product({
        product_variants: [
          { id: "no-photo", main_img_url: null, product_items: [item({ price: 10 })] },
          {
            id: "photo",
            main_img_url: "https://media.example.com/b.webp",
            product_items: [item({ price: 80 }), item({ price: 60 }), item({ price: 5, status: "sold" })],
          },
        ],
      }),
    ]);
    expect(card.price).toBe(60);
    expect(card.imageUrl).toBe("https://media.example.com/b.webp");
  });

  it("keeps compare-at prices only when they are a real markdown", () => {
    const withMarkdown = product({
      product_variants: [{ id: "v", main_img_url: null, product_items: [item({ price: 40, compare_at_price: "70" })] }],
    });
    const bogus = product({
      id: "p-2",
      product_variants: [{ id: "v", main_img_url: null, product_items: [item({ price: 40, compare_at_price: 30 })] }],
    });
    const [a, b] = toHomeProductCards([withMarkdown, bogus]);
    expect(a.compareAtPrice).toBe(70);
    expect(b.compareAtPrice).toBeNull();
  });

  it("respects the limit", () => {
    const rows = Array.from({ length: 5 }, (_, i) => product({ id: `p-${i}` }));
    expect(toHomeProductCards(rows, 3)).toHaveLength(3);
  });
});
