import type OpenAI from "openai";
import { z } from "zod";
import {
  buildResponseSchema,
  parseExtraction,
  type CatalogProduct,
  type ExtractionContext,
  type ExtractionResult,
} from "./extract";
import type { CorrectionPair } from "./history";
import type { DraftFields, ShotRole } from "./schema";

/**
 * Turns product photos (presigned originals) into draft fields constrained to
 * the platform's closed taxonomy, with per-field confidence AND evidence so
 * the owner can audit what the model saw and where.
 *
 * Pure w.r.t. I/O except for the injected OpenAI client, like `extractDraft`,
 * so it runs from the API route and tests alike.
 */

export interface VisionImage {
  url: string;
  role: ShotRole | null;
}

export interface VisionExtractionInput {
  images: VisionImage[];
  /** Current form state so the model doesn't contradict what the owner already has. */
  current?: Partial<DraftFields>;
  hints?: string[];
  /** Up to 3 similar catalog products for few-shot prompting (from buildHistory). */
  examples?: CatalogProduct[];
  /** Up to 3 ai_raw→final correction pairs from published drafts (from buildHistory). */
  corrections?: CorrectionPair[];
}

/**
 * Draft field keys the vision model reports confidence + evidence for. Photos
 * can't see prices or fine condition, so those keys exist but are asked to
 * stay low-confidence (the confidence policy drops them).
 */
export const VISION_FIELD_KEYS = [
  "name",
  "brand",
  "subcategory_id",
  "size",
  "gender",
  "fit",
  "fits_like_min",
  "fits_like_max",
  "metadata",
  "tags",
  "condition_score",
  "price",
  "compare_at_price",
  "stock",
  "defects",
  "also_unisex",
] as const;
export type VisionFieldKey = (typeof VISION_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Structured output schema (extends the voice one with per-field confidence + evidence)
// ---------------------------------------------------------------------------

const str = { type: "string" };

const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

/**
 * Same fields as `buildResponseSchema` but the `confidence` object covers the
 * actual vision-relevant draft keys and a new `evidence` object pairs each key
 * with a short phrase explaining where the model saw it.
 */
export function buildVisionResponseSchema(ctx: ExtractionContext) {
  const base = buildResponseSchema(ctx) as unknown as {
    name: string;
    strict: boolean;
    schema: { properties: Record<string, unknown>; required: string[] };
  };

  return {
    name: "product_draft_vision",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...base.schema.properties,
        confidence: obj(Object.fromEntries(VISION_FIELD_KEYS.map((k) => [k, { type: "number" }]))),
        evidence: obj(Object.fromEntries(VISION_FIELD_KEYS.map((k) => [k, { anyOf: [str, { type: "null" }] }]))),
      },
      required: [...base.schema.required, "evidence"],
    },
  };
}

/**
 * `category_id` is derived, never seen: the form's category picker sets it
 * together with `subcategory_id`. Mirror that here, with the subcategory's
 * confidence, so autofilling one never leaves the required other one empty.
 */
export function withDerivedCategory(
  fields: Partial<DraftFields>,
  confidence: Record<string, number>,
  ctx: Pick<ExtractionContext, "taxonomy">,
): { fields: Partial<DraftFields>; confidence: Record<string, number> } {
  const subcategoryId = fields.subcategory_id;
  const parent = subcategoryId ? ctx.taxonomy.find((c) => c.children.some((s) => s.id === subcategoryId)) : undefined;
  if (!parent) return { fields, confidence };
  return {
    fields: { ...fields, category_id: parent.id },
    confidence: { ...confidence, category_id: confidence.subcategory_id ?? 0 },
  };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<ShotRole, string> = {
  front: "frente",
  back: "espalda",
  label: "etiqueta",
  detail: "detalle",
  defect: "defecto",
  extra: "otra",
};

export function buildVisionSystemPrompt(
  ctx: ExtractionContext,
  opts: { examples?: CatalogProduct[]; corrections?: CorrectionPair[] } = {},
): string {
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

  return `Eres el catalogador visual de "Sale Enzo", tienda de ropa deportiva de segunda mano (Perú, precios en soles).
Conviertes las FOTOS de una prenda en un registro con valores CERRADOS.

# Reglas duras
- Solo usa valores de los enums del esquema. Nunca inventes categorías, marcas, tallas ni ids.
- Si un dato NO se ve con claridad en las fotos, devuélvelo null. No rellenes por intuición.
- "confidence" (0–1) por campo: < 0.6 cuando lo dedujiste de algo ambiguo o parcialmente visible.
- "evidence" por campo: frase corta en español que diga en qué foto lo viste (ej: "etiqueta: talla M", "frente: logo Nike"). Si el campo es null, evidence = null.
- Si se entrega "Estado actual del formulario", conserva sus valores salvo que las fotos los contradigan claramente.

# Taxonomía (elige subcategory_id SOLO de esta lista)
${taxonomy}

# Marcas
Elige "brand" de la lista del enum, normalizando mayúsculas ("Under armour" → "Under Armour", "UA" → "Under Armour", "TNF" → "The North Face").
Si la marca no existe en la lista: brand = null y brand_unlisted = nombre tal cual.

# Tallas y fit
- size: infiérela principalmente de las fotos de etiqueta (label). La etiqueta del cuello suele mostrar la talla.
- brand y estilo: de las fotos de frente (front) y detalle (detail).
- fit: solo si el corte es inequívoco en la foto; si no, null.
- fits_like_min/max: solo si se ve escrito o es inequívoco; si no, null.

# Género
Prenda claramente femenina → female, claramente masculina → male. Solo "unisex" si la etiqueta lo dice. also_unisex true cuando la prenda sirve para ambos.

# Estado y precio
- NO infieras price ni condition_score con confianza alta: las fotos no muestran el precio y el estado se aprecia mal. Devuelve price/compare_at_price null (o confidence < 0.45) salvo que el precio esté claramente visible en una etiqueta.
- condition_score de 1 a 10 en pasos de 0.5. Solo si el estado es inequívoco; si hay dudas, null o confidence < 0.45.
- stock: null salvo que se vea claramente más de una unidad.
- defects: de las fotos de defecto (defect) y del desgaste visible en las demás. type, zone (en español: "manga", "cuello", "espalda"…), severity (minimal/mild/noticeable), note breve.

# Metadata (claves cerradas, valores cortos en su forma canónica)
team, university, league, player, number, technology, edition, collection, sport, use (deporte | salir), material.
Ej: "Chicago Bulls DURANT 35" visible → team "Chicago Bulls", player "Kevin Durant", number "35", league "NBA", sport "basketball".
technology es SOLO la tecnología propia de la marca (Dri-FIT = Nike, HeatGear/ColdGear = Under Armour). Solo si el logo o la etiqueta la muestran.
Solo metadata que las fotos respalden; lo demás null.

# name y tags
- name: nombre comercial limpio en español, con marca y modelo/equipo y color principal, sin talla ni defectos ni precio.
- tags: 3–5 tags cortos en minúscula, útiles para buscar (deporte, equipo, tecnología, estilo). Sin repetir la marca.

# Segmentación
- Las fotos no bastan para agrupar en el catálogo. Elige match_kind "new_product", target_product_ref y target_variant_ref null, y match_reason "Análisis visual de las fotos", salvo que reconozcas SIN NINGUNA DUDA un producto existente del catálogo por su diseño.

# Catálogo existente (refs p:/v: = publicados, dp:/dv: = borradores sin publicar)
${catalog}${historySection(opts)}`;
}

/** Few-shot learning section: similar pieces + owner corrections, only when provided. */
function historySection(opts: { examples?: CatalogProduct[]; corrections?: CorrectionPair[] }): string {
  const examples = opts.examples ?? [];
  const corrections = opts.corrections ?? [];
  if (examples.length === 0 && corrections.length === 0) return "";

  const lines = ["", "# Aprendizaje de capturas anteriores"];

  if (examples.length > 0) {
    lines.push(
      "## Ejemplos similares (referencia de estilo y atributos; NO los copies ciegamente)",
      ...examples.map((p) => {
        const attrs = (p.variants ?? []).map((v) =>
          [
            v.size ? `talla ${v.size}` : null,
            v.gender ?? null,
            v.fit ? `fit ${v.fit}` : null,
            v.fits_like_min
              ? `queda ${v.fits_like_min}${v.fits_like_max && v.fits_like_max !== v.fits_like_min ? `-${v.fits_like_max}` : ""}`
              : null,
            v.tags?.length ? `tags ${v.tags.join(", ")}` : null,
            Object.keys(v.metadata ?? {}).length ? JSON.stringify(v.metadata) : null,
          ]
            .filter(Boolean)
            .join(" | "),
        );
        return `- "${p.name}" | ${p.brand ?? "sin marca"} | subcat ${p.subcategory_id ?? "?"}\n${attrs
          .map((a) => `    - ${a}`)
          .join("\n")}`;
      }),
    );
  }

  if (corrections.length > 0) {
    lines.push(
      "## Correcciones de dueños en capturas pasadas (respeta estas preferencias)",
      ...corrections.map((c) => {
        const raw = (c.ai_raw ?? {}) as Record<string, unknown>;
        const rawStable: Record<string, unknown> = {};
        for (const key of Object.keys(c.final)) {
          if (key in raw) rawStable[key] = raw[key];
        }
        return `- "${c.name}": la IA propuso ${JSON.stringify(rawStable)} y el dueño lo dejó en ${JSON.stringify(c.final)}.`;
      }),
    );
  }

  return lines.join("\n");
}

export function buildVisionUserMessage(
  input: VisionExtractionInput,
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const lines = input.images.map(
    (img, i) => `- Foto ${i + 1}: ${img.role ? ROLE_LABEL[img.role] : "sin asignar"}.`,
  );
  const hints = input.hints?.length ? `\nIndicaciones del dueño: ${input.hints.join(", ")}.` : "";
  const hasCurrent =
    input.current && Object.values(input.current).some((v) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
  const current = hasCurrent
    ? `\n\nEstado actual del formulario (consérvalo salvo que las fotos lo contradigan claramente):\n${JSON.stringify(input.current)}`
    : "";

  return [
    { type: "text", text: `Analiza estas fotos de la prenda y devuelve el registro.\n\n${lines.join("\n")}${hints}${current}` },
    ...input.images.map<OpenAI.Chat.Completions.ChatCompletionContentPart>((img) => ({
      type: "image_url",
      image_url: { url: img.url, detail: img.role === "label" || img.role === "front" ? "high" : "auto" },
    })),
  ];
}

// ---------------------------------------------------------------------------
// Parsing & call
// ---------------------------------------------------------------------------

/** Evidence values can be null when the field is null; normalize them to "". */
const EvidenceSchema = z.record(z.string(), z.string().nullable());

export async function extractFromPhotos(
  openai: OpenAI,
  ctx: ExtractionContext,
  input: VisionExtractionInput,
  model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
): Promise<ExtractionResult & { evidence: Record<string, string> }> {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_schema", json_schema: buildVisionResponseSchema(ctx) },
    messages: [
      {
        role: "system",
        content: buildVisionSystemPrompt(ctx, { examples: input.examples, corrections: input.corrections }),
      },
      { role: "user", content: buildVisionUserMessage(input) },
    ],
  });

  const message = response.choices[0]?.message;
  if (message?.refusal) throw new Error(`Extraction refused: ${message.refusal}`);
  if (!message?.content) throw new Error("Extraction returned no content");

  const json = JSON.parse(message.content) as Record<string, unknown>;
  const evidenceParsed = EvidenceSchema.parse(json.evidence);
  const result = parseExtraction(json, ctx);

  const evidence: Record<string, string> = {};
  for (const key of VISION_FIELD_KEYS) evidence[key] = evidenceParsed[key]?.trim() ?? "";

  return { ...result, evidence };
}
