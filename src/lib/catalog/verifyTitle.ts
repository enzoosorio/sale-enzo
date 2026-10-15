import type OpenAI from "openai";
import { z } from "zod";

/**
 * "Does a product with this name exist?" via OpenAI's web_search tool.
 *
 * Meant for named models (Nike Air Zoom Pegasus 40, iPad Air…). A generic title
 * (brand + garment + color) comes back `matched: false`, which is the honest
 * answer. The result is only ever a suggestion: the UI offers per-field
 * "Aplicar" buttons and never writes to the draft by itself.
 *
 * Sources come from the response's url_citation annotations, never from the
 * model's JSON, so a hallucinated link can't reach the owner.
 *
 * Pure w.r.t. I/O except for the injected OpenAI client (like `extractDraft`).
 */

export interface VerifyTitleInput {
  name: string;
  brand?: string | null;
}

export interface VerifySource {
  title: string;
  url: string;
}

const SpecsSchema = z.object({
  material: z.string().nullable(),
  technology: z.string().nullable(),
  fit: z.string().nullable(),
  release_year: z.string().nullable(),
});

const RawSchema = z.object({
  matched: z.boolean(),
  canonical_name: z.string().nullable(),
  summary: z.string(),
  specs: SpecsSchema,
  confidence: z.number(),
});

export type VerifyTitleResult = z.infer<typeof RawSchema> & { sources: VerifySource[] };

const nullableStr = { anyOf: [{ type: "string" }, { type: "null" }] };

export const VERIFY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["matched", "canonical_name", "summary", "specs", "confidence"],
  properties: {
    matched: { type: "boolean" },
    canonical_name: nullableStr,
    summary: { type: "string" },
    specs: {
      type: "object",
      additionalProperties: false,
      required: ["material", "technology", "fit", "release_year"],
      properties: {
        material: nullableStr,
        technology: nullableStr,
        fit: nullableStr,
        release_year: nullableStr,
      },
    },
    confidence: { type: "number" },
  },
} as const;

export function buildVerifyPrompt({ name, brand }: VerifyTitleInput): string {
  return `Verifica en la web si existe un producto comercial con este nombre.
Nombre: "${name}"
Marca: ${brand ? `"${brand}"` : "(sin marca indicada)"}

Reglas:
- matched = true SOLO si el nombre apunta a un modelo/línea concreta y encuentras fuentes que lo confirman (página oficial, tienda reconocida).
- Si el nombre es genérico (solo marca + tipo de prenda + color, p. ej. "Polo Nike azul"), matched = false y explícalo en summary.
- canonical_name: el nombre comercial oficial del modelo, sin color ni talla. null si matched = false.
- specs: material, tecnología propia de la marca (Dri-FIT, HeatGear…), corte (fit) y año de lanzamiento, solo si las fuentes lo dicen. null si no.
- summary: 1–2 frases en español sobre lo encontrado. Nada inventado.
- confidence: 0–1 de qué tan seguro estás de la coincidencia.`;
}

// ---------------------------------------------------------------------------
// Cache: same brand+name inside a process costs one search, like embedQuery.
// ---------------------------------------------------------------------------

const CACHE_MAX = 200;
const cache = new Map<string, VerifyTitleResult>();

const cacheKey = ({ name, brand }: VerifyTitleInput) =>
  `${(brand ?? "").trim().toLowerCase()}|${name.trim().toLowerCase().replace(/\s+/g, " ")}`;

export function clearVerifyCache() {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Call
// ---------------------------------------------------------------------------

/** Unique http(s) citations from the model's message annotations. */
export function collectSources(response: Pick<OpenAI.Responses.Response, "output">, max = 5): VerifySource[] {
  const seen = new Map<string, VerifySource>();
  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type !== "output_text") continue;
      for (const a of part.annotations ?? []) {
        if (a.type !== "url_citation" || !/^https?:\/\//i.test(a.url) || seen.has(a.url)) continue;
        seen.set(a.url, { title: a.title?.trim() || new URL(a.url).hostname, url: a.url });
      }
    }
  }
  return [...seen.values()].slice(0, max);
}

export async function verifyTitle(
  openai: OpenAI,
  input: VerifyTitleInput,
  model = process.env.OPENAI_WEB_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
): Promise<VerifyTitleResult> {
  const key = cacheKey(input);
  const hit = cache.get(key);
  if (hit) return hit;

  const response = await openai.responses.create({
    model,
    input: buildVerifyPrompt(input),
    tools: [{ type: "web_search", search_context_size: "low" }],
    text: { format: { type: "json_schema", name: "title_verification", strict: true, schema: VERIFY_JSON_SCHEMA } },
  });

  if (!response.output_text) throw new Error("Verification returned no content");
  const raw = RawSchema.parse(JSON.parse(response.output_text));
  const sources = collectSources(response);

  // No citations means nothing to back a match: don't present it as verified.
  const result: VerifyTitleResult =
    raw.matched && sources.length === 0
      ? { ...raw, matched: false, canonical_name: null, confidence: Math.min(raw.confidence, 0.3), sources }
      : { ...raw, sources };

  cache.set(key, result);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return result;
}
