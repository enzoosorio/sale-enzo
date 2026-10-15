import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { presignGet } from "@/lib/r2";
import { staging } from "@/lib/staging/db";

const QuerySchema = z.object({ imageId: z.uuid() });

/**
 * Short-lived signed URL of ONE original (the comparator's "before").
 * The download route is for whole drafts and forces an attachment disposition.
 */
export async function GET(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = QuerySchema.safeParse({ imageId: new URL(req.url).searchParams.get("imageId") });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { data } = await staging().from("draft_images").select("original_key").eq("id", parsed.data.imageId).maybeSingle();
  if (!data?.original_key) return NextResponse.json({ error: "Original not found" }, { status: 404 });

  return NextResponse.json({ url: await presignGet(data.original_key, undefined, 300) }, { headers: { "cache-control": "no-store" } });
}
