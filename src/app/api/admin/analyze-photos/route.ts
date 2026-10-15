import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { applyAiFields } from "@/lib/catalog/confidence";
import { loadExtractionContext } from "@/lib/catalog/catalogContext";
import { narrowCatalog } from "@/lib/catalog/extract";
import { buildHistory, type PublishedDraftRow } from "@/lib/catalog/history";
import { computeMissingFields, EMPTY_DRAFT_FIELDS, type DraftFields } from "@/lib/catalog/schema";
import { extractFromPhotos, withDerivedCategory, type VisionImage } from "@/lib/catalog/visionExtract";
import { openai, visionModel } from "@/lib/openai";
import { presignGet } from "@/lib/r2";
import { getDraft, staging } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

export const runtime = "nodejs";
/** One vision call takes 5-8 s (measured on 14 photos); leave room for a slow model day. Same as /retouch. */
export const maxDuration = 60;

const BodySchema = z.object({
  draftId: z.uuid(),
});

/**
 * Photos → vision extraction → confidence policy → merged draft.
 * One call per analysis; the result is cached under ai_raw.photos keyed by a
 * hash of the original image keys, so re-analyzing an unchanged set is free.
 */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { draftId } = parsed.data;

  const draft = await getDraft(draftId);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status === "published") return NextResponse.json({ error: "Draft already published" }, { status: 409 });

  const doneImages = (draft.images ?? []).filter((i) => i.status === "done" && i.original_key);
  if (doneImages.length === 0) {
    return NextResponse.json({ error: "Necesitas al menos una foto procesada para analizar" }, { status: 400 });
  }

  // Stable identity of the analysis input: same photos in the same roles (any order) → same analysis.
  const keys = doneImages.map((i) => `${i.id}:${i.original_key}:${i.shot_role ?? ""}`).sort();
  const hash = createHash("sha256").update(keys.join("\n")).digest("hex");

  const cached = (draft.ai_raw as { photos?: PhotoAnalysisCache } | null)?.photos;
  if (cached?.hash === hash) {
    return NextResponse.json({
      draft,
      warnings: [],
      suggested: cached.suggested ?? [],
      autofilled: cached.autofilled ?? [],
      dropped: cached.dropped ?? [],
    });
  }

  const base = { ...EMPTY_DRAFT_FIELDS, ...draft } as DraftFields;
  const current = Object.fromEntries(
    (Object.keys(base) as (keyof DraftFields)[]).filter((k) => !["description", "condition_note", "internal_notes", "main_color_hex", "secondary_colors", "specs_raw", "price_notes"].includes(k)).map((k) => [k, base[k]]),
  ) as Partial<DraftFields>;

  try {
    const [ctx, publishedDrafts] = await Promise.all([
      loadExtractionContext(supabaseAdmin, { excludeDraftId: draftId }),
      loadPublishedDrafts(),
    ]);

    // Few-shot material: only useful when the owner already typed a name/brand.
    // Photos barely need the catalog, so keep the prompt small.
    const hint = `${current.brand ?? ""} ${current.name ?? ""}`;
    const visionCtx = { ...ctx, catalog: narrowCatalog(ctx.catalog, hint, 60) };
    const history = buildHistory(visionCtx, draft, publishedDrafts);

    // Presigned URLs are short-lived secrets: build them, use them, never log them.
    const urls = await Promise.all(doneImages.map((img) => presignGet(img.original_key as string, undefined, 300)));
    const images: VisionImage[] = doneImages.map((img, i) => ({ url: urls[i], role: img.shot_role }));

    const result = await extractFromPhotos(
      openai(),
      visionCtx,
      {
        images,
        current,
        hints: ["front primero"],
        examples: history.examples,
        corrections: history.corrections,
      },
      visionModel(),
    );

    // Photos come first, so the draft has no name yet: similarity is only
    // meaningful once the vision model has named the piece. Promotions are
    // computed against the full catalog (not the trimmed prompt one).
    const promotions = buildHistory(
      ctx,
      { name: result.fields.name ?? draft.name, brand: result.fields.brand ?? draft.brand },
      publishedDrafts,
    ).promotions;

    // Historical promotions fill gaps the vision model left, without overriding
    // what it saw with equal or higher confidence (and never user values).
    let mergedFields = { ...result.fields } as Partial<DraftFields>;
    let mergedConfidence = { ...result.confidence };
    const mergedEvidence = { ...result.evidence };

    for (const p of promotions) {
      const visionValue = result.fields[p.key as keyof DraftFields];
      const visionConf = result.confidence[p.key] ?? 0;
      if (!isEmptyValue(visionValue) && visionConf >= p.confidence) continue;

      if (p.key === "metadata" && !isEmptyValue(visionValue)) {
        (mergedFields as Record<string, unknown>).metadata = {
          ...(p.value as Record<string, string>),
          ...(result.fields.metadata ?? {}),
        };
      } else if (p.key === "tags" && !isEmptyValue(visionValue)) {
        mergedFields.tags = [...new Set([...(p.value as string[]), ...(result.fields.tags ?? [])])];
      } else {
        (mergedFields as Record<string, unknown>)[p.key] = p.value;
      }
      mergedConfidence[p.key] = p.confidence;
      mergedEvidence[p.key] = p.evidence;
    }

    // subcategory_id (seen or promoted) must carry its parent category along.
    ({ fields: mergedFields, confidence: mergedConfidence } = withDerivedCategory(mergedFields, mergedConfidence, ctx));

    const applied = applyAiFields<DraftFields>({
      current: base,
      fieldSource: draft.field_source ?? {},
      ai: mergedFields,
      confidence: mergedConfidence,
    });
    const { patch, nextFieldSource } = applied;
    // category_id rides along with subcategory_id: don't count it twice for the owner.
    const [suggested, autofilled, dropped] = [applied.suggested, applied.autofilled, applied.dropped].map((l) =>
      l.filter((k) => k !== "category_id"),
    );

    const merged = { ...base, ...patch } as DraftFields;
    const existingAiRaw =
      typeof draft.ai_raw === "object" && draft.ai_raw !== null ? (draft.ai_raw as Record<string, unknown>) : {};

    const { error } = await staging()
      .from("product_drafts")
      .update({
        ...patch,
        ai_raw: {
          ...existingAiRaw,
          photos: {
            hash,
            raw: result.raw,
            evidence: mergedEvidence,
            warnings: result.warnings,
            suggested,
            autofilled,
            dropped,
            history: {
              examples: history.examples.map((e) => e.ref),
              corrections: history.corrections.length,
              promotions,
            },
          },
        },
        field_confidence: { ...draft.field_confidence, ...mergedConfidence },
        field_source: nextFieldSource,
        missing_fields: computeMissingFields(merged),
      })
      .eq("id", draftId);
    if (error) throw new Error(error.message);

    return NextResponse.json({
      draft: await getDraft(draftId),
      warnings: result.warnings,
      suggested,
      autofilled,
      dropped,
    });
  } catch (e) {
    console.error("analyze-photos failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Published drafts with their ai_raw payloads, newest first: history learning material. */
async function loadPublishedDrafts(): Promise<PublishedDraftRow[]> {
  const { data, error } = await staging()
    .from("product_drafts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`publishedDrafts: ${error.message}`);
  return (data ?? []) as PublishedDraftRow[];
}

const isEmptyValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

interface PhotoAnalysisCache {
  hash?: string;
  suggested?: string[];
  autofilled?: string[];
  dropped?: string[];
}
