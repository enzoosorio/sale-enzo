import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth/isAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Background removal through Replicate (BiRefNet). Only used when
 * NEXT_PUBLIC_BG_PROVIDER=replicate. Requires REPLICATE_API_TOKEN and
 * REPLICATE_BG_VERSION (the model version hash).
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
  const contentType = req.headers.get("content-type") || "image/jpeg";
  const dataUri = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;

  const prediction = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=55",
    },
    body: JSON.stringify({ version, input: { image: dataUri } }),
  }).then((r) => r.json() as Promise<{ status: string; output?: string | string[]; error?: string }>);

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (prediction.status !== "succeeded" || !outputUrl) {
    return NextResponse.json({ error: prediction.error ?? `Prediction ${prediction.status}` }, { status: 502 });
  }

  const png = await fetch(outputUrl);
  return new NextResponse(png.body, { headers: { "content-type": "image/png" } });
}
