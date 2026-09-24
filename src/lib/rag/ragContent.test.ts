import { describe, expect, it } from "vitest";
import {
  buildDeterministicRagContent,
  buildMetadataSemanticBlock,
  buildSearchText,
  type ProductItemData,
} from "./ragContent";

const item: ProductItemData = {
  product_item_id: "item-1",
  product_name: "Casaca de lluvia",
  product_brand: "Columbia",
  category_name: "Casacas",
  subcategory_name: "Casacas para lluvia",
  variant_main_color_hex: "#285A91",
  color_category_name: "Azul",
  variant_size: "M",
  item_price: 120,
  item_stock: 1,
  item_status: "available",
  tags: ["Outdoor", "Senderismo"],
  variant_metadata: { sport: "trekking", feature: "Protección contra lluvia" },
};

describe("RAG content builders", () => {
  it("keeps stock and status out of embedding content", () => {
    const content = buildDeterministicRagContent(item);
    expect(content).toContain("Casaca de lluvia");
    expect(content).toContain("Sport relevance: trekking");
    expect(content).not.toContain("Stock:");
    expect(content).not.toContain("Status:");
    expect(buildDeterministicRagContent({ ...item, item_stock: 0, item_status: "sold" })).toBe(content);
  });

  it("normalizes accents and includes lexical attributes", () => {
    const text = buildSearchText(item);
    expect(text).toContain("proteccion contra lluvia");
    expect(text).toContain("columbia casacas casacas para lluvia");
    expect(text).not.toContain("120");
  });

  it("handles empty metadata", () => {
    expect(buildMetadataSemanticBlock({})).toBe("");
  });
});
