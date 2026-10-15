import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { presignPut, publicUrl } from "@/lib/r2";
import { bucketForKind, imageKey, isVersionedKind, type ImageKind } from "@/lib/storage/keys";
import { draftCategorySlug, staging } from "@/lib/staging/db";

const BodySchema = z.object({
  draftId: z.uuid(),
  position: z.number().int().min(0).max(19),
  kinds: z.array(z.enum(["original", "cutout", "web", "ironed", "ironed-web"])).min(1),
  /** Required for ironed kinds: the version suffix comes from this row, never from the client. */
  imageId: z.uuid().optional(),
});

const CONTENT_TYPE: Record<ImageKind, string> = {
  original: "image/jpeg",
  cutout: "image/webp",
  web: "image/webp",
  ironed: "image/webp",
  "ironed-web": "image/webp",
};

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
  const { draftId, position, kinds, imageId } = parsed.data;

  const { data: draft, error } = await staging()
    .from("product_drafts")
    .select("sku, category_id")
    .eq("id", draftId)
    .maybeSingle();
  if (error || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  // Versioned kinds take their generation from the image row the retouch route already bumped.
  let version: number | undefined;
  if (kinds.some(isVersionedKind)) {
    if (!imageId) return NextResponse.json({ error: "imageId is required for ironed uploads" }, { status: 400 });
    const { data: image } = await staging()
      .from("draft_images")
      .select("draft_id, position, ironed_version, ironed_status")
      .eq("id", imageId)
      .maybeSingle();
    if (!image || image.draft_id !== draftId || image.position !== position) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    if (image.ironed_status !== "pending" || image.ironed_version < 1) {
      return NextResponse.json({ error: "No ironing in progress for this image" }, { status: 409 });
    }
    version = image.ironed_version;
  }

  const category = await draftCategorySlug(draft);
  const uploads = await Promise.all(
    kinds.map(async (kind) => {
      const key = imageKey(kind, category, draft.sku, position, isVersionedKind(kind) ? version : undefined);
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
