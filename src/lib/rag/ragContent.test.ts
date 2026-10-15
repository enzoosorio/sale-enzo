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

  it("includes condition note in content", () => {
    const content = buildDeterministicRagContent({
      ...item,
      item_condition: "used",
      item_condition_note: "Leve desgaste en el cuello",
    });
    expect(content).toContain("Condition: used");
    expect(content).toContain("Condition note: Leve desgaste en el cuello");
  });

  it("renders fits-like range when min and max differ", () => {
    const content = buildDeterministicRagContent({
      ...item,
      variant_fits_like_min: "M",
      variant_fits_like_max: "L",
    });
    expect(content).toContain("Fits like: M–L");
  });

  it("renders single fits-like size when only min is set", () => {
    const content = buildDeterministicRagContent({ ...item, variant_fits_like_min: "M" });
    expect(content).toContain("Fits like: M");
    expect(content).not.toContain("Fits like: M–");
  });

  it("keeps raw hex color out of content", () => {
    const content = buildDeterministicRagContent(item);
    expect(content).not.toContain("#285A91");
    expect(content).not.toContain("Main color:");
    expect(content).toContain("Color category: Azul");
  });

  it("does not leak also_unisex or fits_like keys into metadata block", () => {
    const content = buildDeterministicRagContent({
      ...item,
      variant_metadata: {
        sport: "trekking",
        also_unisex: "true",
        fits_like_min: "S",
        fits_like_max: "M",
      },
    });
    expect(content).toContain("Sport relevance: trekking");
    expect(content).not.toContain("Also_unisex");
    expect(content).not.toContain("also_unisex");
    expect(content).not.toContain("Fits_like_min");
    expect(content).not.toContain("Fits_like_max");
  });

  it("includes description, condition note and fits-like text in search text", () => {
    const text = buildSearchText({
      ...item,
      product_description: "Impermeable y ligera para trekking",
      item_condition_note: "Como nueva",
      variant_fits_like_min: "S",
      variant_fits_like_max: "M",
    });
    expect(text).toContain("impermeable y ligera para trekking");
    expect(text).toContain("como nueva");
    expect(text).toContain("fits like: s–m");
  });
});
