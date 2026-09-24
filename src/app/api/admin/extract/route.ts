import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { openai } from "@/lib/openai";
import { extractDraft, narrowCatalog } from "@/lib/catalog/extract";
import { loadExtractionContext } from "@/lib/catalog/catalogContext";
import { computeMissingFields, EMPTY_DRAFT_FIELDS, type DraftFields } from "@/lib/catalog/schema";
import { getDraft, staging } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  draftId: z.uuid(),
  transcript: z.string().min(2).max(4000),
});

/** Keys the extraction may fill; image-derived and owner-only fields are left alone. */
const EXTRACTABLE: (keyof DraftFields)[] = Object.keys(EMPTY_DRAFT_FIELDS).filter(
  (k) => !["main_color_hex", "secondary_colors", "description", "condition_note", "internal_notes"].includes(k),
) as (keyof DraftFields)[];

/**
 * Transcript + current draft → merged draft.
 * Nulls from the model never erase values the owner already has: the model
 * only adds or corrects what the new utterance actually mentions.
 */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { draftId, transcript } = parsed.data;

  const draft = await getDraft(draftId);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status === "published") return NextResponse.json({ error: "Draft already published" }, { status: 409 });

  const current = Object.fromEntries(EXTRACTABLE.map((k) => [k, draft[k]])) as Partial<DraftFields>;

  try {
    const ctx = await loadExtractionContext(supabaseAdmin, { excludeDraftId: draftId });
    const result = await extractDraft(
      openai(),
      { ...ctx, catalog: narrowCatalog(ctx.catalog, transcript) },
      { utterance: transcript, source: "voice", current },
    );

    const patch: Partial<DraftFields> = {};
    for (const key of EXTRACTABLE) {
      const value = result.fields[key];
      const empty = value === null || value === undefined || (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);
      if (!empty) (patch as Record<string, unknown>)[key] = value;
    }
    // Segmentation is always the model's latest call (it saw the whole state)
    Object.assign(patch, {
      match_kind: result.fields.match_kind,
      target_product_id: result.fields.target_product_id ?? null,
      target_variant_id: result.fields.target_variant_id ?? null,
      target_draft_id: result.fields.target_draft_id ?? null,
      match_reason: result.fields.match_reason,
    });

    const merged = { ...EMPTY_DRAFT_FIELDS, ...current, ...patch } as DraftFields;
    const transcriptLog = [draft.transcript, transcript].filter(Boolean).join("\n---\n");

    const { error } = await staging()
      .from("product_drafts")
      .update({
        ...patch,
        transcript: transcriptLog,
        ai_raw: { raw: result.raw, warnings: result.warnings },
        field_confidence: { ...draft.field_confidence, ...result.confidence },
        missing_fields: computeMissingFields(merged),
      })
      .eq("id", draftId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ draft: await getDraft(draftId), warnings: result.warnings });
  } catch (e) {
    console.error("extract failed", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
