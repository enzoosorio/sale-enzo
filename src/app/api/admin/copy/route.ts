import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { openai } from "@/lib/openai";
import { auditCopy, generatePublicCopy } from "@/lib/catalog/copywriter";
import { getDraft, staging } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

export const runtime = "nodejs";

const BodySchema = z.object({ draftId: z.uuid() });

/** (Re)generates the public description + tactful condition note for a draft. */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const draft = await getDraft(parsed.data.draftId);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const { data: sub } = draft.subcategory_id
    ? await supabaseAdmin.from("product_categories").select("name").eq("id", draft.subcategory_id).maybeSingle()
    : { data: null };

  try {
    const copy = await generatePublicCopy(openai(), {
      ...draft,
      condition_score: draft.condition_score === null ? null : Number(draft.condition_score),
      subcategory_name: sub?.name ?? null,
    });
    const issues = auditCopy(copy, { defects: draft.defects, condition_score: Number(draft.condition_score) });

    await staging()
      .from("product_drafts")
      .update({ description: copy.description, condition_note: copy.condition_note })
      .eq("id", draft.id);

    return NextResponse.json({ ...copy, issues });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
