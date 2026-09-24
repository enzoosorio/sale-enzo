import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { presignGet } from "@/lib/r2";
import { getDraftImages, staging } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

/**
 * GET /api/admin/r2/download?draftId=...   → signed URLs of a draft's originals
 * GET /api/admin/r2/download?variantId=... → signed URLs of a published variant's originals
 */
export async function GET(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const draftId = params.get("draftId");
  const variantId = params.get("variantId");

  let sku = "producto";
  let keys: string[] = [];

  if (draftId) {
    const { data: draft } = await staging().from("product_drafts").select("sku").eq("id", draftId).maybeSingle();
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    sku = draft.sku;
    keys = (await getDraftImages(draftId)).map((i) => i.original_key).filter((k): k is string => !!k);
  } else if (variantId) {
    const { data } = await supabaseAdmin
      .from("variant_images")
      .select("original_key, position")
      .eq("variant_id", variantId)
      .order("position");
    keys = (data ?? []).map((i) => i.original_key).filter((k): k is string => !!k);
    sku = keys[0]?.split("/")[2] ?? sku;
  } else {
    return NextResponse.json({ error: "draftId or variantId required" }, { status: 400 });
  }

  const files = await Promise.all(
    keys.map(async (key, i) => ({
      name: `${sku}-${i + 1}.jpg`,
      url: await presignGet(key, `${sku}-${i + 1}.jpg`),
    })),
  );

  return NextResponse.json({ files });
}
