import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { removeBackgroundViaReplicate } from "@/lib/bg/replicateServer";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Background removal through Replicate (BiRefNet), the automatic fallback of the
 * capture worker when the on-device cutout doesn't pass the quality gate.
 * Requires REPLICATE_API_TOKEN and REPLICATE_BG_VERSION (the model version hash);
 * without them it answers 501 and the worker just skips this provider.
 *
 * The worker sends a JPEG of at most 2048 px, so the body (and its base64 form)
 * stays well under serverless request limits.
 */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_BG_VERSION;
  if (!token || !version) {
    return NextResponse.json({ error: "Replicate not configured" }, { status: 501 });
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Invalid image size" }, { status: 400 });
  }

  const result = await removeBackgroundViaReplicate(bytes, req.headers.get("content-type") || "image/jpeg", { token, version });
  if (!result.ok) {
    console.error("bg failed:", result.error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return new NextResponse(result.png, { headers: { "content-type": "image/png" } });
}
