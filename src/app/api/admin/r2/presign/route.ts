import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { presignPut, publicUrl } from "@/lib/r2";
import { bucketForKind, imageKey } from "@/lib/storage/keys";
import { draftCategorySlug, staging } from "@/lib/staging/db";

const BodySchema = z.object({
  draftId: z.uuid(),
  position: z.number().int().min(0).max(19),
  kinds: z.array(z.enum(["original", "cutout", "web"])).min(1),
});

const CONTENT_TYPE = { original: "image/jpeg", cutout: "image/webp", web: "image/webp" } as const;

/**
 * Returns presigned PUT URLs for a draft image. Keys are computed server-side
 * from the draft's sku + category so the client can't write elsewhere.
 */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { draftId, position, kinds } = parsed.data;

  const { data: draft, error } = await staging()
    .from("product_drafts")
    .select("sku, category_id")
    .eq("id", draftId)
    .maybeSingle();
  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const category = await draftCategorySlug(draft);
  const uploads = await Promise.all(
    kinds.map(async (kind) => {
      const key = imageKey(kind, category, draft.sku, position);
      return {
        kind,
        key,
        contentType: CONTENT_TYPE[kind],
        url: await presignPut(bucketForKind(kind), key, CONTENT_TYPE[kind]),
        publicUrl: kind === "original" ? null : publicUrl(key),
      };
    }),
  );

  return NextResponse.json({ uploads });
}
