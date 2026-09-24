import type OpenAI from "openai";
import { z } from "zod";
import type { Defect, DraftFields } from "./schema";

/**
 * Customer-facing copy for a draft:
 * - description: commercial description (neutral specs + metadata)
 * - condition_note: one tactful line about the garment's condition
 *
 * Defects are always disclosed, but softly worded and never alarmist.
 * Omitting a visible defect breeds returns and distrust.
 */

export type CopyInput = Pick<
  DraftFields,
  "name" | "brand" | "size" | "gender" | "also_unisex" | "fit" | "fits_like_min" | "fits_like_max" | "metadata" | "condition_score" | "specs_raw" | "defects"
> & { subcategory_name?: string | null };

export interface PublicCopy {
  description: string;
  condition_note: string;
}

const TYPE_ES: Record<Defect["type"], string> = {
  hole: "agujero",
  stain: "mancha",
  pilling: "motas",
  fading: "decoloración",
  wear: "desgaste",
  pull: "jalón de tela",
  other: "detalle",
};

const SEVERITY_ES: Record<Defect["severity"], string> = {
  minimal: "mínimo",
  mild: "leve",
  noticeable: "visible",
};

const SYSTEM = `Redactas textos de producto para "Sale Enzo", tienda de ropa deportiva de segunda mano en Perú.
Tono: cercano, honesto, seguro. Español neutro peruano. Sin emojis, sin mayúsculas gritonas.

Devuelves:
1) description: 2–4 frases. Qué es la prenda, para qué sirve (deporte/salir), tecnología, equipo/universidad/jugador, material, cómo queda (talla y fit). Solo hechos presentes en los datos; no inventes.
2) condition_note: UNA frase corta sobre el estado.

Reglas para defectos (obligatorias):
- Menciona TODOS los defectos listados en condition_note, agrupados si hay varios. Nunca los omitas ni los niegues.
- Dilo con tacto: lenguaje suave y concreto ("detalle mínimo en una manga, casi imperceptible", "leve marca en el cuello que no se nota al usarlo").
- Prohibido: "hueco", "roto", "manchado", "defecto grave", "dañado", alarmismo.
- Prohibido también exagerar hacia arriba: nada de "perfecto", "impecable", "como nuevo" si condition_score < 10 o hay defectos.
- Puedes mencionar el precio justo como consecuencia del detalle ("por eso su precio especial"), sin cifras.
- Sin defectos y condition_score ≥ 9.5 → condition_note destaca el excelente estado. Con 10 → "en estado de nuevo".
- description NO repite los defectos; esos van solo en condition_note.
- No inventes material, tecnología, fit ni cualidades ("materiales de calidad", "transpirable", "fit moderno") si no están en los datos. Si fit es null, no hables del corte.
- Una comparación de tela ("similar a Dri-FIT") se redacta como comparación ("tela deportiva ligera, al estilo Dri-FIT"), nunca como tecnología de la prenda.
- "precio especial" solo si condition_score < 9, y como mucho una vez.`;

const ResponseSchema = z.object({ description: z.string().min(1), condition_note: z.string().min(1) });

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "public_copy",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { description: { type: "string" }, condition_note: { type: "string" } },
      required: ["description", "condition_note"],
    },
  },
} as const;

export function buildCopyPrompt(input: CopyInput): string {
  const defects = input.defects.length
    ? input.defects
        .map((d) => `- ${TYPE_ES[d.type]} en ${d.zone || "zona no indicada"} (${SEVERITY_ES[d.severity]})${d.note ? `: ${d.note}` : ""}`)
        .join("\n")
    : "ninguno";
  const fitsLike =
    input.fits_like_min && input.fits_like_max && input.fits_like_min !== input.fits_like_max
      ? `${input.fits_like_min}–${input.fits_like_max}`
      : (input.fits_like_min ?? null);

  return JSON.stringify(
    {
      nombre: input.name,
      marca: input.brand,
      subcategoria: input.subcategory_name ?? null,
      talla: input.size,
      le_queda_como: fitsLike,
      genero: input.gender,
      tambien_unisex: input.also_unisex,
      fit: input.fit,
      metadata: input.metadata,
      specs: input.specs_raw,
      condition_score: input.condition_score,
    },
    null,
    2,
  ) + `\n\nDefectos:\n${defects}`;
}

export async function generatePublicCopy(
  openai: OpenAI,
  input: CopyInput,
  model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
): Promise<PublicCopy> {
  const response = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: RESPONSE_FORMAT,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildCopyPrompt(input) },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Copywriter returned no content");
  return ResponseSchema.parse(JSON.parse(content));
}

/** Words that must never reach the public condition note (see SYSTEM rules). */
export const BANNED_CONDITION_WORDS = /\b(hueco|roto|rota|manchad[oa]|dañad[oa]|defecto grave)\b/i;
export const OVERCLAIM_WORDS = /\b(perfect[oa]|impecable|como nuev[oa])\b/i;

/** Post-check used by tests and before saving: flags copy that breaks the rules. */
export function auditCopy(
  copy: PublicCopy,
  input: Pick<CopyInput, "defects" | "condition_score"> & { fit?: CopyInput["fit"] },
): string[] {
  const issues: string[] = [];
  if (BANNED_CONDITION_WORDS.test(copy.condition_note) || BANNED_CONDITION_WORDS.test(copy.description)) {
    issues.push("Usa palabras alarmistas");
  }
  if ((input.defects.length > 0 || (input.condition_score ?? 10) < 10) && OVERCLAIM_WORDS.test(copy.condition_note)) {
    issues.push("Exagera el estado pese a tener defectos");
  }
  if (input.defects.length > 0 && copy.condition_note.length < 25) {
    issues.push("La nota de estado parece no mencionar los defectos");
  }
  if (!input.fit && /\b(corte|fit) (slim|regular|oversize|boxy)\b/i.test(copy.description)) {
    issues.push("Menciona un corte que no está en los datos");
  }
  if ((input.condition_score ?? 0) >= 9 && /precio especial/i.test(`${copy.description} ${copy.condition_note}`)) {
    issues.push("Dice 'precio especial' con buen estado");
  }
  return issues;
}
