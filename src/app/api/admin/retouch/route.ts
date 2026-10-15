import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { getObjectBytes } from "@/lib/r2";
import { RetouchError, retouchProvider } from "@/lib/retouch";
import { ironBlockReason } from "@/lib/retouch/rules";
import { staging } from "@/lib/staging/db";
import type { DraftImageRow } from "@/types/staging";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ draftId: z.uuid(), imageId: z.uuid() });

/** Providers return ~1K anyway; sending more only costs upload time and tokens. */
const IRON_INPUT_SIDE = 1568;

/**
 * Original photo → ironed JPEG (a suggestion). Nothing public is written here:
 * the browser sends the result through the same worker as every photo (background
 * removal + quality gate), uploads it under a versioned key and the owner decides.
 *
 * Billing happens per generated call, so the generation is counted *before*
 * calling the provider and given back if the provider fails (failures aren't billed).
 */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { draftId, imageId } = parsed.data;

  const { data, error } = await staging().from("draft_images").select("*").eq("id", imageId).maybeSingle();
  const image = data as DraftImageRow | null;
  if (error || !image || image.draft_id !== draftId) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
  const { data: draft } = await staging().from("product_drafts").select("status").eq("id", draftId).maybeSingle();
  if (!draft || draft.status === "published" || draft.status === "discarded") {
    return NextResponse.json({ error: "Draft is closed" }, { status: 409 });
  }
  const blocked = ironBlockReason(image);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  // Count the generation first. The version guard makes a double click lose the race instead of paying twice.
  const provider = retouchProvider();
  const version = image.ironed_version + 1;
  const { data: claimed } = await staging()
    .from("draft_images")
    .update({ ironed_status: "pending", ironed_version: version, ironed_provider: provider.name, ironed_check: null })
    .eq("id", imageId)
    .eq("ironed_version", image.ironed_version)
    .select("id")
    .maybeSingle();
  if (!claimed) return NextResponse.json({ error: "Otra generación está en curso" }, { status: 409 });

  try {
    const original = await getObjectBytes("originals", image.original_key as string);
    const input = await sharp(original.bytes)
      .rotate() // honor EXIF orientation: phone photos are often stored sideways
      .resize({ width: IRON_INPUT_SIDE, height: IRON_INPUT_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();

    const ironed = await provider.iron({ bytes: new Uint8Array(input), mime: "image/jpeg" });
    // Normalize whatever the provider returned (PNG, WebP…) to one format for the worker.
    const jpeg = await sharp(ironed.bytes).jpeg({ quality: 92 }).toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "no-store",
        "x-ironed-version": String(version),
        "x-ironed-provider": provider.name,
      },
    });
  } catch (e) {
    // Nothing was generated: give the attempt back and restore what the owner had.
    await staging()
      .from("draft_images")
      .update({ ironed_status: image.ironed_status === "pending" ? "none" : image.ironed_status, ironed_version: image.ironed_version })
      .eq("id", imageId)
      .eq("ironed_version", version);
    console.error("retouch failed:", e instanceof Error ? e.message : e);
    const status = e instanceof RetouchError && e.status === 501 ? 501 : 502;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Retouch failed" }, { status });
  }
}
