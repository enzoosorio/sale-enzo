import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import {
  buildResponseSchema,
  buildSystemPrompt,
  extractDraft,
  narrowCatalog,
  parseExtraction,
  type ExtractionContext,
  type RawExtraction,
} from "./extract";
import { METADATA_KEYS } from "./schema";

const POLOS = "00000000-0000-4000-8000-000000000001";
const SHORT = "00000000-0000-4000-8000-000000000002";
const PRODUCT = "11111111-1111-4111-8111-111111111111";
const VARIANT = "22222222-2222-4222-8222-222222222222";
const DRAFT = "33333333-3333-4333-8333-333333333333";

const ctx: ExtractionContext = {
  taxonomy: [{ id: POLOS, name: "Polos", slug: "polos", children: [{ id: SHORT, name: "Polos manga corta", slug: "polos-manga-corta" }] }],
  brands: ["Nike", "Under Armour"],
  catalog: [
    {
      ref: `p:${PRODUCT}`,
      name: "Polo Nike Dri-FIT Academy",
      brand: "Nike",
      subcategory_id: SHORT,
      variants: [{ ref: `v:${VARIANT}`, size: "M", gender: "male", fit: "regular", color: "#000000", metadata: {} }],
    },
    {
      ref: `dp:${DRAFT}`,
      name: "Polo Nike Dri-FIT manga larga negro",
      brand: "Nike",
      subcategory_id: SHORT,
      variants: [{ ref: `dv:${DRAFT}`, size: "L", gender: "unisex", fit: null, color: null, metadata: {} }],
    },
  ],
};

const base: RawExtraction = {
  match_kind: "new_product",
  target_product_ref: null,
  target_variant_ref: null,
  match_reason: "",
  name: "Polo Nike Chicago Bulls Durant 35 naranja",
  brand: "Nike",
  brand_unlisted: null,
  subcategory_id: SHORT,
  size: "M",
  gender: "male",
  also_unisex: false,
  fit: null,
  fits_like_min: "XS",
  fits_like_max: "S",
  metadata: Object.fromEntries(METADATA_KEYS.map((k) => [k, null])),
  tags: ["Basket", "nba", "basket", "retro", "chicago", "bulls"],
  condition_score: 8,
  price: 39,
  compare_at_price: null,
  price_notes: null,
  stock: null,
  neutral_specs: null,
  defects: [{ type: "stain", zone: "pecho", severity: "mild", note: null }],
  confidence: { match: 0.9 },
};

describe("buildResponseSchema", () => {
  it("is strict: every object requires all its properties and forbids extras", () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (n.type === "object") {
        expect(n.additionalProperties).toBe(false);
        expect(n.required).toEqual(Object.keys(n.properties as object));
      }
      Object.values(n).forEach(walk);
    };
    walk(buildResponseSchema(ctx).schema);
  });

  it("closes subcategory, brand and refs to the live context", () => {
    const props = buildResponseSchema(ctx).schema.properties as Record<string, { anyOf?: { enum?: string[] }[] }>;
    expect(props.subcategory_id.anyOf?.[0].enum).toEqual([SHORT]);
    expect(props.brand.anyOf?.[0].enum).toEqual(["Nike", "Under Armour"]);
    expect(props.target_variant_ref.anyOf?.[0].enum).toEqual([`v:${VARIANT}`, `dv:${DRAFT}`]);
  });
});

describe("parseExtraction", () => {
  it("maps a clean new product and derives category from subcategory", () => {
    const { fields, warnings } = parseExtraction(base, ctx);
    expect(fields.match_kind).toBe("new_product");
    expect(fields.category_id).toBe(POLOS);
    expect(fields.tags).toEqual(["basket", "nba", "retro", "chicago", "bulls"]);
    expect(fields.metadata).toEqual({});
    expect(fields.stock).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("degrades a variant pointing to an unknown product", () => {
    const { fields, confidence, warnings } = parseExtraction(
      { ...base, match_kind: "new_variant", target_product_ref: "p:99999999-9999-4999-8999-999999999999" },
      ctx,
    );
    expect(fields.match_kind).toBe("new_product");
    expect(fields.target_product_id).toBeNull();
    expect(confidence.match).toBeLessThan(0.6);
    expect(warnings.length).toBe(1);
  });

  it("new_item resolves both variant and owning product", () => {
    const { fields } = parseExtraction(
      { ...base, name: "Polo Nike Dri-FIT Academy negro", match_kind: "new_item", target_variant_ref: `v:${VARIANT}` },
      ctx,
    );
    expect(fields).toMatchObject({ match_kind: "new_item", target_variant_id: VARIANT, target_product_id: PRODUCT });
  });

  it("sibling draft becomes target_draft_id", () => {
    const { fields } = parseExtraction(
      { ...base, name: "Polo Nike Dri-FIT manga larga blanco", match_kind: "new_variant", target_product_ref: `dp:${DRAFT}` },
      ctx,
    );
    expect(fields).toMatchObject({ match_kind: "new_variant", target_product_id: null, target_draft_id: DRAFT });
  });

  it("drops invented subcategory/brand ids and flags unlisted brand", () => {
    const { fields, warnings } = parseExtraction(
      { ...base, subcategory_id: "not-an-id", brand: null, brand_unlisted: "Champion" },
      ctx,
    );
    expect(fields.subcategory_id).toBeNull();
    expect(fields.brand).toBeNull();
    expect(warnings.join(" ")).toContain("Champion");
  });

  it("rounds condition and rejects non-sensical compare_at", () => {
    const { fields } = parseExtraction({ ...base, condition_score: 8.3, compare_at_price: 20 }, ctx);
    expect(fields.condition_score).toBe(8.5);
    expect(fields.compare_at_price).toBeNull();
  });
});

describe("extractDraft", () => {
  it("sends strict json_schema and parses the response", async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(base) } }] });
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const result = await extractDraft(openai, ctx, { utterance: "polo bulls durant", source: "voice" }, "test-model");

    const args = create.mock.calls[0][0];
    expect(args.response_format.type).toBe("json_schema");
    expect(args.response_format.json_schema.strict).toBe(true);
    expect(args.messages[0].content).toContain(`subcategory_id "${SHORT}"`);
    expect(result.fields.name).toBe(base.name);
  });
});

describe("prompt + catalog narrowing", () => {
  it("system prompt lists the catalog refs", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain(`p:${PRODUCT}`);
    expect(prompt).toContain(`dv:${DRAFT}`);
  });

  it("narrowCatalog prefers products mentioned in the utterance", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...ctx.catalog[0], ref: `p:${i}`, name: `Polo ${i}`, brand: "Puma" }));
    const result = narrowCatalog([...many, ctx.catalog[0]], "polo nike academy", 3);
    expect(result[0].ref).toBe(`p:${PRODUCT}`);
  });
});

describe("segmentation guard", () => {
  const siblings: ExtractionContext = {
    ...ctx,
    catalog: [
      { ref: `dp:${DRAFT}`, name: "Polo Nike Dri-FIT manga larga negro humo", brand: "Nike", subcategory_id: SHORT, variants: [{ ref: `dv:${DRAFT}`, size: "L", gender: "unisex", fit: null, color: null, metadata: {} }] },
      { ref: `p:${PRODUCT}`, name: "Polo Nike Boston University verde camo", brand: "Nike", subcategory_id: SHORT, variants: [{ ref: `v:${VARIANT}`, size: "M", gender: "male", fit: "slim", color: null, metadata: {} }] },
    ],
  };

  it("rejects an attachment whose design doesn't match", () => {
    const { fields, warnings } = parseExtraction(
      { ...base, name: "Polo Nike Team USA azul marino", match_kind: "new_item", target_variant_ref: `v:${VARIANT}` },
      siblings,
    );
    expect(fields.match_kind).toBe("new_product");
    expect(warnings[0]).toContain("no coincide");
  });

  it("promotes a color sibling to a variant, with low confidence", () => {
    const { fields, confidence } = parseExtraction({ ...base, name: "Polo Nike Dri-FIT manga larga blanco humo" }, siblings);
    expect(fields).toMatchObject({ match_kind: "new_variant", target_draft_id: DRAFT });
    expect(confidence.match).toBe(0.5);
  });

  it("new_item with a different size becomes a variant", () => {
    const { fields } = parseExtraction(
      { ...base, name: "Polo Nike Boston University verde camo", size: "L", match_kind: "new_item", target_variant_ref: `v:${VARIANT}` },
      siblings,
    );
    expect(fields.match_kind).toBe("new_variant");
  });
});

describe("brand-owned technology", () => {
  it("'como dri fit' on Under Armour becomes a fabric comparison", () => {
    const { fields, warnings } = parseExtraction(
      { ...base, brand: "Under Armour", name: "Polo Under Armour deportivo zebra", metadata: { ...base.metadata, technology: "Dri-FIT" } },
      ctx,
    );
    expect(fields.metadata).toEqual({ material: "tela deportiva (similar a Dri-FIT)" });
    expect(warnings.join(" ")).toContain("Nike");
  });

  it("keeps Dri-FIT on Nike", () => {
    const { fields } = parseExtraction({ ...base, metadata: { ...base.metadata, technology: "Dri-FIT" } }, ctx);
    expect(fields.metadata).toEqual({ technology: "Dri-FIT" });
  });
});
