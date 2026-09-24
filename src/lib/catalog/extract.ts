import type OpenAI from "openai";
import { z } from "zod";
import {
  DEFECT_SEVERITIES,
  DEFECT_TYPES,
  DefectSchema,
  FITS,
  GENDERS,
  MATCH_KINDS,
  METADATA_KEYS,
  SIZES,
  type DraftFields,
  type MetadataKey,
} from "./schema";
import { ATTACH_MIN_SIMILARITY, designSimilarity, PROMOTE_MIN_SIMILARITY } from "./similarity";

/**
 * Turns a free-form utterance (voice transcript or spreadsheet row) into draft
 * fields constrained to the platform's closed taxonomy, and decides where the
 * piece belongs in products -> variants -> items.
 *
 * Pure w.r.t. I/O except for the injected OpenAI client, so it runs from the
 * API route, the xlsx import script and tests alike.
 */

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface TaxonomyNode {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

export interface CatalogVariant {
  /** "v:<uuid>" for published variants, "dv:<draftId>" for staged drafts */
  ref: string;
  size: string | null;
  gender: string | null;
  fit: string | null;
  color: string | null;
  metadata: Record<string, string>;
}

export interface CatalogProduct {
  /** "p:<uuid>" for published products, "dp:<draftId>" for staged drafts */
  ref: string;
  name: string;
  brand: string | null;
  subcategory_id: string | null;
  variants: CatalogVariant[];
}

export interface ExtractionContext {
  taxonomy: TaxonomyNode[];
  brands: string[];
  catalog: CatalogProduct[];
}

export interface ExtractionInput {
  /** Dictation transcript, or a spreadsheet row rendered as "column: value" lines. */
  utterance: string;
  source: "voice" | "xlsx";
  /** Current form state so dictated corrections ("cambia la talla a L") apply on top. */
  current?: Partial<DraftFields>;
}

// ---------------------------------------------------------------------------
// Structured output schema (OpenAI strict json_schema)
// ---------------------------------------------------------------------------

const CONFIDENCE_KEYS = [
  "match",
  "subcategory",
  "brand",
  "size",
  "gender",
  "fit",
  "condition_score",
  "price",
  "metadata",
] as const;

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });
const str = { type: "string" };
const enumOf = (values: readonly string[]) => ({ type: "string", enum: [...values] });

const MAX_ENUM_REFS = 400;

/** Proprietary fabric technologies and the brand that owns each one. */
const TECH_OWNERS: Record<string, string> = {
  drifit: "Nike",
  heatgear: "Under Armour",
  coldgear: "Under Armour",
  climalite: "Adidas",
  aeroready: "Adidas",
  drycell: "Puma",
};

export function buildResponseSchema(ctx: ExtractionContext) {
  const subcategoryIds = ctx.taxonomy.flatMap((c) => c.children.map((s) => s.id));
  const productRefs = ctx.catalog.map((p) => p.ref).slice(0, MAX_ENUM_REFS);
  const variantRefs = ctx.catalog.flatMap((p) => p.variants.map((v) => v.ref)).slice(0, MAX_ENUM_REFS);

  const obj = (properties: Record<string, unknown>) => ({
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  });

  return {
    name: "product_draft",
    strict: true,
    schema: obj({
      match_kind: enumOf(MATCH_KINDS),
      target_product_ref: productRefs.length ? nullable(enumOf(productRefs)) : { type: "null" },
      target_variant_ref: variantRefs.length ? nullable(enumOf(variantRefs)) : { type: "null" },
      match_reason: str,

      name: nullable(str),
      brand: ctx.brands.length ? nullable(enumOf(ctx.brands)) : { type: "null" },
      brand_unlisted: nullable(str),
      subcategory_id: subcategoryIds.length ? nullable(enumOf(subcategoryIds)) : { type: "null" },

      size: nullable(enumOf(SIZES)),
      gender: nullable(enumOf(GENDERS)),
      also_unisex: { type: "boolean" },
      fit: nullable(enumOf(FITS)),
      fits_like_min: nullable(enumOf(SIZES)),
      fits_like_max: nullable(enumOf(SIZES)),
      metadata: obj(Object.fromEntries(METADATA_KEYS.map((k) => [k, nullable(str)]))),
      tags: { type: "array", items: str },

      condition_score: nullable({ type: "number" }),
      price: nullable({ type: "number" }),
      compare_at_price: nullable({ type: "number" }),
      price_notes: nullable(str),
      stock: nullable({ type: "integer" }),

      neutral_specs: nullable(str),
      defects: {
        type: "array",
        items: obj({
          type: enumOf(DEFECT_TYPES),
          zone: str,
          severity: enumOf(DEFECT_SEVERITIES),
          note: nullable(str),
        }),
      },

      confidence: obj(Object.fromEntries(CONFIDENCE_KEYS.map((k) => [k, { type: "number" }]))),
    }),
  } as const;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export function buildSystemPrompt(ctx: ExtractionContext): string {
  const taxonomy = ctx.taxonomy
    .map((c) => `- ${c.name}\n${c.children.map((s) => `  - ${s.name} → subcategory_id "${s.id}"`).join("\n")}`)
    .join("\n");

  const catalog = ctx.catalog.length
    ? ctx.catalog
        .map((p) => {
          const variants = p.variants
            .map(
              (v) =>
                `    - ${v.ref} | talla ${v.size ?? "?"} | ${v.gender ?? "?"} | fit ${v.fit ?? "?"} | color ${v.color ?? "?"}` +
                (Object.keys(v.metadata).length ? ` | ${JSON.stringify(v.metadata)}` : ""),
            )
            .join("\n");
          return `- ${p.ref} | "${p.name}" | ${p.brand ?? "sin marca"} | subcat ${p.subcategory_id ?? "?"}\n${variants}`;
        })
        .join("\n")
    : "(catálogo vacío)";

  return `Eres el catalogador de "Sale Enzo", tienda de ropa deportiva de segunda mano (Perú, precios en soles).
Conviertes una descripción informal (dictado por voz o fila de Excel escrita sin estándar) en un registro con valores CERRADOS.

# Reglas duras
- Solo usa valores de los enums del esquema. Nunca inventes categorías, marcas, tallas ni ids.
- Si un dato NO se menciona o no se deduce con seguridad, devuélvelo null. No rellenes por intuición.
- "confidence" (0–1) por campo: < 0.6 cuando dedujiste algo ambiguo.
- Si se entrega "Estado actual del formulario", conserva sus valores salvo que la entrada los corrija explícitamente.

# Taxonomía (elige subcategory_id SOLO de esta lista)
${taxonomy}
"polo manga corta", "Polo manga corta", "polos m/c" → la subcategoría de manga corta. Manga larga igual.

# Marcas
Elige "brand" de la lista del enum, normalizando mayúsculas ("Under armour" → "Under Armour", "UA" → "Under Armour", "TNF" → "The North Face").
Si la marca no existe en la lista: brand = null y brand_unlisted = nombre tal cual.

# Tallas y fit
- size: talla de etiqueta.
- fit: corte de la prenda (slim/regular/oversize/boxy). Solo si se menciona o es inequívoco.
- fits_like_min/max: "le queda como", "talla XS - S", "M - L". Una sola talla → min = max.
- En Excel la columna "fit" mezcla ambos conceptos: "Slim (S)" → fit slim + fits_like S; "L" o "M - L" → solo fits_like.

# Género
"Male unisex", "male - unisex", "hombre pero unisex" → gender male + also_unisex true. "unisex" → gender unisex. "mujer"/"female" → female.

# Estado y precio
- condition_score de 1 a 10 en pasos de 0.5 ("8.5/10" → 8.5, "como nuevo" → 9.5, "nuevo con etiqueta" → 10).
- "69 pero dcto a 59" → price 59, compare_at_price 69.
- Varias opciones de precio ("69 o 79") → price null y el texto en price_notes: el dueño decide.
- stock: solo si se dice cuántas unidades; si no, null.

# Metadata (claves cerradas, valores cortos en su forma canónica)
team, university, league, player, number, technology, edition, collection, sport, use (deporte | salir), material.
Ej: "chicago bulls DURANT 35" → team "Chicago Bulls", player "Kevin Durant", number "35", league "NBA", sport "basketball".
"Tecnologia DRI FIT" → technology "Dri-FIT". "HEATGEAR" → technology "HeatGear". "Oregon ducks" → university "University of Oregon", team "Oregon Ducks", league "NCAA".
Solo metadata que la entrada respalde; lo demás null.
technology es SOLO la tecnología propia de la marca (Dri-FIT = Nike, HeatGear/ColdGear = Under Armour).
Comparaciones como "como dri fit", "tipo dri fit" en otra marca describen la tela, no la tecnología:
technology = null y material = "tela deportiva (similar a Dri-FIT)".

# Especificaciones → defectos (privados) vs specs neutrales (públicas)
- defects: todo daño o imperfección (huecos, manchas, jalones, desgaste, decoloración). type, zone (en español: "manga", "cuello", "espalda", "logo del pecho"…), severity (minimal/mild/noticeable), note breve.
- neutral_specs: características que NO son defectos ("polo con escudo de EEUU", "etiqueta dice SAMPLE"). null si no hay.
- La decoloración mencionada en el nombre ("naranja desteñido") también es un defecto de tipo fading.

# name
Nombre comercial limpio en español, sin talla ni defectos ni precio, con marca y modelo/equipo y color principal.
Ej: "Nike chicago bulls orange DURANT 35 naranja desteñido" → "Polo Nike Chicago Bulls Durant 35 naranja".
Corrige errores obvios ("Ney York" → "New York").

# tags
3–5 tags cortos en minúscula, útiles para buscar (deporte, equipo, tecnología, estilo). Sin repetir la marca.

# Segmentación (products → variants → items)
- product = mismo modelo/diseño de la misma marca (mismo estampado, mismo equipo/jugador, misma línea).
- variant = mismo product pero otra talla, otro color u otro fit.
- item = otra unidad física de una variante que YA existe (misma talla, color, fit).
Decide:
- new_product: no hay un product equivalente en el catálogo. target_product_ref = null, target_variant_ref = null.
- new_variant: el product existe (target_product_ref) pero cambia talla, color o fit. target_variant_ref = null.
- new_item: existe exactamente la misma variante (target_variant_ref y su target_product_ref).
Ante la duda entre product y variant, elige new_product con confidence.match < 0.6: el dueño revisa.
Productos genéricos ("polo convencional Dri-FIT gris") solo se agrupan si el diseño coincide claramente.
match_reason: una frase en español que explique la decisión.

# Catálogo existente (refs p:/v: = publicados, dp:/dv: = borradores sin publicar)
${catalog}`;
}

export function buildUserPrompt(input: ExtractionInput): string {
  const current =
    input.current && Object.values(input.current).some((v) => v !== null && v !== undefined)
      ? `\n\nEstado actual del formulario:\n${JSON.stringify(input.current)}`
      : "";
  const label = input.source === "voice" ? "Dictado" : "Fila de Excel";
  return `${label}:\n${input.utterance}${current}`;
}

// ---------------------------------------------------------------------------
// Parsing & validation
// ---------------------------------------------------------------------------

const RawSchema = z.object({
  match_kind: z.enum(MATCH_KINDS),
  target_product_ref: z.string().nullable(),
  target_variant_ref: z.string().nullable(),
  match_reason: z.string(),
  name: z.string().nullable(),
  brand: z.string().nullable(),
  brand_unlisted: z.string().nullable(),
  subcategory_id: z.string().nullable(),
  size: z.enum(SIZES).nullable(),
  gender: z.enum(GENDERS).nullable(),
  also_unisex: z.boolean(),
  fit: z.enum(FITS).nullable(),
  fits_like_min: z.enum(SIZES).nullable(),
  fits_like_max: z.enum(SIZES).nullable(),
  metadata: z.record(z.string(), z.string().nullable()),
  tags: z.array(z.string()),
  condition_score: z.number().nullable(),
  price: z.number().nullable(),
  compare_at_price: z.number().nullable(),
  price_notes: z.string().nullable(),
  stock: z.number().int().nullable(),
  neutral_specs: z.string().nullable(),
  defects: z.array(DefectSchema),
  confidence: z.record(z.string(), z.number()),
});
export type RawExtraction = z.infer<typeof RawSchema>;

export interface ExtractionResult {
  fields: Partial<DraftFields>;
  confidence: Record<string, number>;
  /** Things the owner must look at, e.g. unlisted brand or a degraded match. */
  warnings: string[];
  raw: RawExtraction;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRef(ref: string | null): { kind: "p" | "v" | "dp" | "dv"; id: string } | null {
  const m = ref?.match(/^(p|v|dp|dv):(.+)$/);
  return m && UUID_RE.test(m[2]) ? { kind: m[1] as "p" | "v" | "dp" | "dv", id: m[2] } : null;
}

/**
 * Validates the model output against the live context and degrades anything
 * that doesn't hold up (unknown ids, inconsistent match) to a safe value.
 */
export function parseExtraction(json: unknown, ctx: ExtractionContext): ExtractionResult {
  const raw = RawSchema.parse(json);
  const warnings: string[] = [];
  const confidence = { ...raw.confidence };

  // --- Taxonomy
  const parentOf = new Map(ctx.taxonomy.flatMap((c) => c.children.map((s) => [s.id, c.id] as const)));
  const subcategory_id = raw.subcategory_id && parentOf.has(raw.subcategory_id) ? raw.subcategory_id : null;
  if (raw.subcategory_id && !subcategory_id) warnings.push(`Subcategoría desconocida descartada: ${raw.subcategory_id}`);

  // --- Brand
  const brand = raw.brand && ctx.brands.includes(raw.brand) ? raw.brand : null;
  if (!brand && raw.brand_unlisted) {
    warnings.push(`Marca "${raw.brand_unlisted}" no está en la lista: confírmala o agrégala.`);
  }

  // --- Segmentation
  const productRefs = new Set(ctx.catalog.map((p) => p.ref));
  const variantOwner = new Map(ctx.catalog.flatMap((p) => p.variants.map((v) => [v.ref, p.ref] as const)));

  let match_kind = raw.match_kind;
  let productRef = raw.target_product_ref && productRefs.has(raw.target_product_ref) ? raw.target_product_ref : null;
  let variantRef = raw.target_variant_ref && variantOwner.has(raw.target_variant_ref) ? raw.target_variant_ref : null;
  if (variantRef) productRef = variantOwner.get(variantRef) ?? productRef;

  if (match_kind === "new_item" && !variantRef) {
    match_kind = productRef ? "new_variant" : "new_product";
    warnings.push("La IA propuso un item de una variante inexistente; se degradó.");
  }
  if (match_kind === "new_variant" && !productRef) {
    match_kind = "new_product";
    warnings.push("La IA propuso una variante de un producto inexistente; se degradó a producto nuevo.");
  }
  if (match_kind === "new_product") {
    productRef = null;
    variantRef = null;
  }
  if (match_kind === "new_variant") variantRef = null;
  if (match_kind !== raw.match_kind) confidence.match = Math.min(confidence.match ?? 1, 0.4);

  // Deterministic check: attachments must share the design (name minus colors) and brand
  let match_reason = raw.match_reason;
  const candidateName = raw.name ?? "";
  const target = productRef ? ctx.catalog.find((p) => p.ref === productRef) : undefined;
  if (match_kind !== "new_product" && target) {
    const sameBrand = !target.brand || !brand || target.brand === brand;
    if (!sameBrand || designSimilarity(candidateName, target.name, brand) < ATTACH_MIN_SIMILARITY) {
      warnings.push(`La IA lo agrupó con "${target.name}", pero el diseño no coincide: queda como producto nuevo.`);
      match_kind = "new_product";
      productRef = variantRef = null;
      match_reason = "Producto nuevo: el diseño no coincide con ningún producto del catálogo.";
      confidence.match = Math.min(confidence.match ?? 1, 0.5);
    } else if (match_kind === "new_item") {
      const variant = target.variants.find((v) => v.ref === variantRef);
      const differs = !variant || variant.size !== raw.size || (!!variant.gender && !!raw.gender && variant.gender !== raw.gender);
      if (differs) {
        match_kind = "new_variant";
        variantRef = null;
        match_reason = `Variante nueva de "${target.name}": cambia talla o género.`;
      }
    }
  }

  // Same design, same brand and subcategory, only the color changes → suggest a variant
  if (match_kind === "new_product" && candidateName && brand) {
    const best = ctx.catalog
      .filter((p) => p.brand === brand && (!p.subcategory_id || !subcategory_id || p.subcategory_id === subcategory_id))
      .map((p) => ({ p, sim: designSimilarity(candidateName, p.name, brand) }))
      .sort((a, b) => b.sim - a.sim)[0];
    if (best && best.sim >= PROMOTE_MIN_SIMILARITY) {
      match_kind = "new_variant";
      productRef = best.p.ref;
      variantRef = null;
      match_reason = `Variante de "${best.p.name}": mismo diseño, cambia el color o la talla.`;
      confidence.match = 0.5;
      warnings.push(`Agrupado como variante de "${best.p.name}" por nombre. Confírmalo o cámbialo a producto nuevo.`);
    }
  }

  const p = parseRef(productRef);
  const v = parseRef(variantRef);
  const draftTarget = v?.kind === "dv" ? v.id : p?.kind === "dp" ? p.id : null;

  // --- Metadata (closed keys, non-empty values only)
  const metadata: Partial<Record<MetadataKey, string>> = {};
  for (const key of METADATA_KEYS) {
    const value = raw.metadata[key]?.trim();
    if (value) metadata[key] = value;
  }

  // Brand-owned technologies can't be claimed by other brands ("como dri fit" = fabric comparison)
  const owner = metadata.technology ? TECH_OWNERS[metadata.technology.toLowerCase().replace(/[^a-z]/g, "")] : undefined;
  if (owner && brand && owner !== brand) {
    metadata.material ??= `tela deportiva (similar a ${metadata.technology})`;
    warnings.push(`"${metadata.technology}" es de ${owner}; se guardó como comparación de tela, no como tecnología.`);
    delete metadata.technology;
  }

  // --- Numbers
  const condition_score =
    raw.condition_score !== null && raw.condition_score >= 1 && raw.condition_score <= 10
      ? Math.round(raw.condition_score * 2) / 2
      : null;
  const price = raw.price !== null && raw.price > 0 ? raw.price : null;
  const compare_at_price =
    raw.compare_at_price !== null && price !== null && raw.compare_at_price > price ? raw.compare_at_price : null;

  const tags = [...new Set(raw.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5);

  const fields: Partial<DraftFields> = {
    match_kind,
    target_product_id: p?.kind === "p" ? p.id : null,
    target_variant_id: v?.kind === "v" ? v.id : null,
    target_draft_id: draftTarget,
    match_reason,
    name: raw.name?.trim() || null,
    brand,
    subcategory_id,
    category_id: subcategory_id ? (parentOf.get(subcategory_id) ?? null) : null,
    size: raw.size,
    gender: raw.gender,
    also_unisex: raw.gender === "unisex" ? false : raw.also_unisex,
    fit: raw.fit,
    fits_like_min: raw.fits_like_min,
    fits_like_max: raw.fits_like_max ?? raw.fits_like_min,
    metadata,
    tags,
    condition_score,
    price,
    compare_at_price,
    price_notes: raw.price_notes,
    specs_raw: raw.neutral_specs,
    defects: raw.defects,
  };
  if (raw.stock !== null && raw.stock >= 0) fields.stock = raw.stock;

  return { fields, confidence, warnings, raw };
}

// ---------------------------------------------------------------------------
// Call
// ---------------------------------------------------------------------------

export async function extractDraft(
  openai: OpenAI,
  ctx: ExtractionContext,
  input: ExtractionInput,
  model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
): Promise<ExtractionResult> {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_schema", json_schema: buildResponseSchema(ctx) },
    messages: [
      { role: "system", content: buildSystemPrompt(ctx) },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const message = response.choices[0]?.message;
  if (message?.refusal) throw new Error(`Extraction refused: ${message.refusal}`);
  if (!message?.content) throw new Error("Extraction returned no content");
  return parseExtraction(JSON.parse(message.content), ctx);
}

/**
 * Keeps the prompt small when the catalog grows: products whose brand or name
 * tokens appear in the utterance first, then the most recent ones.
 */
export function narrowCatalog(catalog: CatalogProduct[], utterance: string, limit = 120): CatalogProduct[] {
  if (catalog.length <= limit) return catalog;
  const text = utterance.toLowerCase();
  const score = (p: CatalogProduct) =>
    (p.brand && text.includes(p.brand.toLowerCase()) ? 2 : 0) +
    p.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && text.includes(w)).length;
  return catalog
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map(({ p }) => p);
}
