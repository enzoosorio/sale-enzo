import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import {
  buildVisionResponseSchema,
  buildVisionSystemPrompt,
  extractFromPhotos,
  VISION_FIELD_KEYS,
  withDerivedCategory,
  type VisionExtractionInput,
} from "./visionExtract";
import { METADATA_KEYS } from "./schema";
import type { ExtractionContext } from "./extract";

const POLOS = "00000000-0000-4000-8000-000000000001";
const SHORT = "00000000-0000-4000-8000-000000000002";
const PRODUCT = "11111111-1111-4111-8111-111111111111";
const VARIANT = "22222222-2222-4222-8222-222222222222";

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
  ],
};

/** Valid vision output: every RawSchema field plus vision confidence + evidence. */
const visionRaw = {
  match_kind: "new_product",
  target_product_ref: null,
  target_variant_ref: null,
  match_reason: "Análisis visual de las fotos",
  name: "Polo Nike Chicago Bulls Durant 35 naranja",
  brand: "Nike",
  brand_unlisted: null,
  subcategory_id: SHORT,
  size: "M",
  gender: "male",
  also_unisex: false,
  fit: "regular",
  fits_like_min: null,
  fits_like_max: null,
  metadata: Object.fromEntries(METADATA_KEYS.map((k) => [k, null])),
  tags: ["basket", "nba", "retro"],
  condition_score: null,
  price: null,
  compare_at_price: null,
  price_notes: null,
  stock: null,
  neutral_specs: null,
  defects: [],
  confidence: {
    name: 0.9,
    brand: 0.95,
    subcategory_id: 0.8,
    size: 0.95,
    gender: 0.7,
    fit: 0.6,
    fits_like_min: 0.2,
    fits_like_max: 0.2,
    metadata: 0.3,
    tags: 0.6,
    condition_score: 0.2,
    price: 0.1,
    compare_at_price: 0.1,
    stock: 0.1,
    defects: 0.5,
    also_unisex: 0.9,
  },
  evidence: {
    name: "frente: estampado Chicago Bulls Durant 35",
    brand: "frente: logo Nike",
    subcategory_id: "frente: polo de manga corta",
    size: "etiqueta: talla M",
    gender: "frente: corte masculino",
    fit: "frente: corte regular",
    fits_like_min: null,
    fits_like_max: null,
    metadata: null,
    tags: "frente: diseño de básquet",
    condition_score: null,
    price: null,
    compare_at_price: null,
    stock: null,
    defects: null,
    also_unisex: "detalle: sirve para ambos",
  },
};

const visionInput: VisionExtractionInput = {
  images: [
    { url: "https://r2.example/front.jpg", role: "front" },
    { url: "https://r2.example/back.jpg", role: "back" },
    { url: "https://r2.example/label.jpg", role: "label" },
  ],
  current: { name: "Polo Nike", size: "L" },
  hints: ["front primero"],
};

type ImagePart = { type: "image_url"; image_url: { url: string; detail?: string } };

describe("buildVisionResponseSchema", () => {
  it("is strict and pairs every vision field with confidence + evidence", () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (n.type === "object") {
        expect(n.additionalProperties).toBe(false);
        expect(n.required).toEqual(Object.keys(n.properties as object));
      }
      Object.values(n).forEach(walk);
    };
    const schema = buildVisionResponseSchema(ctx).schema;
    walk(schema);

    const props = (schema as { properties: Record<string, Record<string, unknown>> }).properties;
    const confidenceKeys = Object.keys(props.confidence.properties as object);
    const evidenceKeys = Object.keys(props.evidence.properties as object);
    for (const key of VISION_FIELD_KEYS) {
      expect(confidenceKeys).toContain(key);
      expect(evidenceKeys).toContain(key);
    }
    expect((schema as { required: string[] }).required).toContain("evidence");
  });
});

describe("buildVisionSystemPrompt", () => {
  it("explains the visual task and refuses to guess price/condition", () => {
    const prompt = buildVisionSystemPrompt(ctx);
    expect(prompt).toContain("catalogador visual");
    expect(prompt).toContain(`subcategory_id "${SHORT}"`);
    expect(prompt).toContain("NO infieras price");
    expect(prompt).toContain("fotos de etiqueta");
  });

  it("appends few-shot examples and owner corrections when provided", () => {
    const prompt = buildVisionSystemPrompt(ctx, {
      examples: [ctx.catalog[0]],
      corrections: [
        { name: "Polo Nike Academy", brand: "Nike", ai_raw: { fit: "slim" }, final: { fit: "regular" } },
      ],
    });

    expect(prompt).toContain("Aprendizaje de capturas anteriores");
    expect(prompt).toContain("Polo Nike Dri-FIT Academy");
    expect(prompt).toContain('la IA propuso {"fit":"slim"}');
    expect(prompt).toContain('{"fit":"regular"}');
  });

  it("omits the history section when nothing is provided", () => {
    const prompt = buildVisionSystemPrompt(ctx);
    expect(prompt).not.toContain("Aprendizaje de capturas anteriores");
  });
});

describe("extractFromPhotos", () => {
  it("sends role-aware image_url parts and returns fields, confidence and evidence", async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(visionRaw) } }] });
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const result = await extractFromPhotos(openai, ctx, visionInput, "test-vision-model");

    const args = create.mock.calls[0][0];
    expect(args.model).toBe("test-vision-model");
    expect(args.response_format.type).toBe("json_schema");
    expect(args.response_format.json_schema.strict).toBe(true);

    const parts = args.messages[1].content;
    expect(Array.isArray(parts)).toBe(true);
    expect(parts[0].type).toBe("text");
    expect((parts[0].text as string)).toContain("Estado actual del formulario");
    const imageParts = parts.slice(1) as ImagePart[];
    expect(imageParts.map((p) => p.type)).toEqual(["image_url", "image_url", "image_url"]);
    expect(imageParts[0].image_url.detail).toBe("high"); // front
    expect(imageParts[1].image_url.detail).toBe("auto"); // back
    expect(imageParts[2].image_url.detail).toBe("high"); // label

    expect(result.fields.name).toBe(visionRaw.name);
    expect(result.fields.size).toBe("M");
    expect(result.fields.subcategory_id).toBe(SHORT);
    expect(result.confidence.size).toBe(0.95);
    expect(result.confidence.brand).toBe(0.95);
    expect(result.evidence.size).toBe("etiqueta: talla M");
    expect(result.evidence.brand).toBe("frente: logo Nike");
    expect(result.warnings).toEqual([]);
  });

  it("degrades unknown subcategory ids and flags unlisted brands via parseExtraction", async () => {
    const bad = {
      ...visionRaw,
      subcategory_id: "not-an-id",
      brand: null,
      brand_unlisted: "Champion",
      evidence: { ...visionRaw.evidence, brand: "frente: logo Champion", subcategory_id: "frente: tipo de prenda" },
    };
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(bad) } }] });
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const result = await extractFromPhotos(openai, ctx, { images: [{ url: "https://r2.example/front.jpg", role: "front" }] }, "m");

    expect(result.fields.subcategory_id).toBeNull();
    expect(result.fields.brand).toBeNull();
    expect(result.warnings.join(" ")).toContain("Champion");
  });

  it("normalizes null evidence to empty strings", async () => {
    const withNulls = { ...visionRaw, evidence: { ...visionRaw.evidence, price: null, defects: null } };
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(withNulls) } }] });
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const result = await extractFromPhotos(openai, ctx, visionInput, "m");

    expect(result.evidence.price).toBe("");
    expect(result.evidence.defects).toBe("");
    expect(result.evidence.size).toBe("etiqueta: talla M");
  });
});

describe("withDerivedCategory", () => {
  it("sets the parent category with the subcategory's confidence", () => {
    const res = withDerivedCategory({ subcategory_id: SHORT }, { subcategory_id: 0.85 }, ctx);
    expect(res.fields.category_id).toBe(POLOS);
    expect(res.confidence.category_id).toBe(0.85);
  });

  it("leaves everything alone when there is no known subcategory", () => {
    const fields = { subcategory_id: null };
    const res = withDerivedCategory(fields, { subcategory_id: 0.9 }, ctx);
    expect(res.fields).toBe(fields);
    expect(res.fields.category_id).toBeUndefined();
  });
});
