import { describe, expect, it } from "vitest";
import type { CatalogProduct, ExtractionContext } from "./extract";
import {
  buildHistory,
  NEVER_PROMOTE_KEYS,
  STABLE_ATTRIBUTE_KEYS,
  type PublishedDraftRow,
} from "./history";

const POLOS = "00000000-0000-4000-8000-000000000001";
const SHORT = "00000000-0000-4000-8000-000000000002";
const V1 = "22222222-2222-4222-8222-222222222222";

const ctx = (catalog: CatalogProduct[]): ExtractionContext => ({
  taxonomy: [{ id: POLOS, name: "Polos", slug: "polos", children: [{ id: SHORT, name: "Polos manga corta", slug: "polos-manga-corta" }] }],
  brands: ["Nike", "Adidas"],
  catalog,
});

const polo = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  ref: "p:11111111-1111-4111-8111-111111111111",
  name: "Polo Nike Dri-FIT Academy rojo",
  brand: "Nike",
  subcategory_id: SHORT,
  variants: [
    {
      ref: `v:${V1}`,
      size: "M",
      gender: "male",
      fit: "regular",
      color: "#ff0000",
      metadata: { technology: "Dri-FIT", team: "Academy FC" },
      tags: ["dri-fit", "academy"],
      fits_like_min: "M",
      fits_like_max: "L",
    },
  ],
  ...overrides,
});

const current = { name: "Polo Nike Dri-FIT Academy azul", brand: "Nike" };

describe("buildHistory promotions", () => {
  it("promotes stable attributes from a similar product", () => {
    const history = buildHistory(ctx([polo({})]), current, []);

    const byKey = new Map(history.promotions.map((p) => [p.key, p]));
    expect(history.promotions.map((p) => p.key).sort()).toEqual(
      [...STABLE_ATTRIBUTE_KEYS].sort(),
    );

    expect(byKey.get("subcategory_id")?.value).toBe(SHORT);
    expect(byKey.get("gender")?.value).toBe("male");
    expect(byKey.get("fit")?.value).toBe("regular");
    expect(byKey.get("fits_like_min")?.value).toBe("M");
    expect(byKey.get("fits_like_max")?.value).toBe("L");
    expect(byKey.get("tags")?.value).toEqual(["dri-fit", "academy"]);
    expect(byKey.get("metadata")?.value).toEqual({ technology: "Dri-FIT", team: "Academy FC" });

    for (const p of history.promotions) {
      expect(p.confidence).toBe(0.85);
      expect(p.evidence).toBe("igual a Polo Nike Dri-FIT Academy rojo");
    }
  });

  it("raises confidence to 0.9 when multiple candidates agree", () => {
    const a = polo({ ref: "p:11111111-1111-4111-8111-111111111111", name: "Polo Nike Dri-FIT Academy rojo" });
    const b = polo({ ref: "p:33333333-3333-4333-8333-333333333333", name: "Polo Nike Dri-FIT Academy blanco" });
    const history = buildHistory(ctx([a, b]), current, []);

    const subcategory = history.promotions.find((p) => p.key === "subcategory_id");
    expect(subcategory).toBeDefined();
    expect(subcategory?.confidence).toBe(0.9);
    expect(subcategory?.evidence).toBe("igual a Polo Nike Dri-FIT Academy rojo");
  });

  it("does not promote an attribute when candidates disagree", () => {
    const a = polo({
      ref: "p:11111111-1111-4111-8111-111111111111",
      variants: [{ ...polo({}).variants[0], fit: "slim", gender: "male" }],
    });
    const b = polo({
      ref: "p:33333333-3333-4333-8333-333333333333",
      name: "Polo Nike Dri-FIT Academy blanco",
      variants: [{ ...polo({}).variants[0], fit: "regular", gender: "male" }],
    });
    const history = buildHistory(ctx([a, b]), current, []);

    const keys = history.promotions.map((p) => p.key);
    expect(keys).not.toContain("fit");
    expect(history.promotions.find((p) => p.key === "gender")?.value).toBe("male");
  });

  it("never promotes price, size, condition or identity fields", () => {
    const history = buildHistory(ctx([polo({})]), current, []);

    for (const banned of NEVER_PROMOTE_KEYS) {
      expect(history.promotions.map((p) => p.key)).not.toContain(banned);
    }
    expect(history.promotions).toHaveLength(STABLE_ATTRIBUTE_KEYS.length);
  });

  it("does not promote anything when the brand differs", () => {
    const otherBrand = polo({
      ref: "p:44444444-4444-4444-8444-444444444444",
      brand: "Adidas",
    });
    const history = buildHistory(ctx([otherBrand]), current, []);

    expect(history.promotions).toEqual([]);
    expect(history.examples).toEqual([]);
  });

  it("promotes nothing when similarity is below the threshold", () => {
    const unrelated = polo({
      ref: "p:55555555-5555-4555-8555-555555555555",
      name: "Polo Nike City Edition negro",
      variants: [{ ...polo({}).variants[0], tags: ["city"] }],
    });
    const history = buildHistory(ctx([unrelated]), current, []);

    expect(history.promotions).toEqual([]);
  });
});

describe("buildHistory examples", () => {
  it("ranks examples by design similarity", () => {
    const a = polo({ ref: "p:11111111-1111-4111-8111-111111111111", name: "Polo Nike Dri-FIT Academy rojo" });
    const b = polo({ ref: "p:33333333-3333-4333-8333-333333333333", name: "Polo Nike Academy blanco" });
    const c = polo({ ref: "p:55555555-5555-4555-8555-555555555555", name: "Polo Nike Dri-FIT Pro negro" });
    const history = buildHistory(ctx([c, b, a]), current, []);

    expect(history.examples.map((e) => e.ref)).toEqual([
      "p:11111111-1111-4111-8111-111111111111",
      "p:33333333-3333-4333-8333-333333333333",
      "p:55555555-5555-4555-8555-555555555555",
    ]);
  });

  it("caps examples at maxExamples", () => {
    const a = polo({ ref: "p:11111111-1111-4111-8111-111111111111", name: "Polo Nike Dri-FIT Academy rojo" });
    const b = polo({ ref: "p:33333333-3333-4333-8333-333333333333", name: "Polo Nike Academy blanco" });
    const c = polo({ ref: "p:55555555-5555-4555-8555-555555555555", name: "Polo Nike Dri-FIT Pro negro" });
    const history = buildHistory(ctx([a, b, c]), current, [], { maxExamples: 2 });

    expect(history.examples).toHaveLength(2);
    expect(history.examples[0].name).toContain("Dri-FIT Academy");
  });
});

describe("buildHistory corrections", () => {
  const correctionDraft = (overrides: Partial<PublishedDraftRow>): PublishedDraftRow => ({
    id: "66666666-6666-4666-8666-666666666666",
    name: "Polo Nike Academy",
    brand: "Nike",
    ai_raw: {
      photos: {
        raw: {
          fit: "slim",
          gender: "male",
          subcategory_id: SHORT,
          tags: ["basquet"],
          metadata: { technology: "Dri-FIT" },
        },
      },
    },
    fit: "regular",
    gender: "male",
    subcategory_id: SHORT,
    tags: ["basquet", "retro"],
    metadata: { technology: "Dri-FIT" },
    ...overrides,
  });

  it("detects stable attributes the owner changed after AI proposed them", () => {
    const history = buildHistory(ctx([]), current, [correctionDraft({})]);

    expect(history.corrections).toHaveLength(1);
    const pair = history.corrections[0];
    expect(pair.name).toBe("Polo Nike Academy");
    expect(pair.final).toEqual({ fit: "regular", tags: ["basquet", "retro"] });
  });

  it("also reads voice ai_raw.raw when photos are absent", () => {
    const draft = correctionDraft({
      ai_raw: { raw: { fit: "slim", tags: ["basquet"] } },
    });
    const history = buildHistory(ctx([]), current, [draft]);

    expect(history.corrections).toHaveLength(1);
    expect(history.corrections[0].final.fit).toBe("regular");
  });

  it("skips drafts without ai_raw or without any changed stable attribute", () => {
    const noAiRaw = correctionDraft({ id: "77777777-7777-4777-8777-777777777777", ai_raw: null });
    const unchanged = correctionDraft({
      id: "88888888-8888-4888-8888-888888888888",
      ai_raw: { photos: { raw: { fit: "regular", gender: "male", tags: ["basquet", "retro"] } } },
    });
    const history = buildHistory(ctx([]), current, [noAiRaw, unchanged]);

    expect(history.corrections).toEqual([]);
  });

  it("orders corrections by published_at desc and caps at maxCorrections", () => {
    const older = correctionDraft({
      id: "99999999-9999-4999-8999-999999999999",
      published_at: "2026-10-01T00:00:00.000Z",
    });
    const newer = correctionDraft({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      published_at: "2026-10-10T00:00:00.000Z",
    });
    const history = buildHistory(ctx([]), current, [older, newer], { maxCorrections: 1 });

    expect(history.corrections).toHaveLength(1);
    expect(history.corrections[0].name).toBe(newer.name);
  });
});

describe("buildHistory empty context", () => {
  it("returns empty history when there is nothing to learn from", () => {
    const history = buildHistory(ctx([]), { name: null, brand: null }, []);

    expect(history.examples).toEqual([]);
    expect(history.corrections).toEqual([]);
    expect(history.promotions).toEqual([]);
  });
});

describe("buildHistory in the photos-first flow", () => {
  it("finds nothing while the draft has no name yet, but promotes once the vision name is known", () => {
    const catalog = ctx([polo({})]);
    expect(buildHistory(catalog, { name: null, brand: null }, []).promotions).toEqual([]);

    const afterVision = buildHistory(catalog, { name: "Polo Nike Dri-FIT Academy azul", brand: "Nike" }, []);
    expect(afterVision.promotions.length).toBeGreaterThan(0);
  });
});
