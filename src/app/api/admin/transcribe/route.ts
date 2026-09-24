import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { openai, STT_VOCABULARY } from "@/lib/openai";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

/** Dynamic STT prompt: brands + domain terms + recent product names help with odd names. */
async function vocabularyPrompt(): Promise<string> {
  const [brands, products] = await Promise.all([
    supabaseAdmin.from("brands").select("name"),
    supabaseAdmin.from("products").select("name").order("created_at", { ascending: false }).limit(20),
  ]);
  const terms = [
    ...(brands.data ?? []).map((b) => b.name as string),
    ...STT_VOCABULARY,
    ...(products.data ?? []).map((p) => p.name as string),
  ];
  return `Polos deportivos de segunda mano. Términos: ${[...new Set(terms)].join(", ")}.`;
}

export async function POST(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "audio too large" }, { status: 413 });
  }

  try {
    const transcription = await openai().audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
      language: "es",
      prompt: await vocabularyPrompt(),
    });
    return NextResponse.json({ text: transcription.text });
  } catch (e) {
    console.error("transcribe failed", e);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
