import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { verifyTitle } from "@/lib/catalog/verifyTitle";
import { openai, webModel } from "@/lib/openai";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).nullish(),
});

/** Title (+ brand) → "does this product exist?" with web sources. A suggestion only: nothing is written. */
export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  try {
    const result = await verifyTitle(openai(), parsed.data, webModel());
    return NextResponse.json({ result });
  } catch (e) {
    console.error("verify-title failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
