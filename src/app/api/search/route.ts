import { NextResponse } from "next/server";
import { z } from "zod";
import { searchProducts } from "@/lib/search/searchProducts";

export const runtime = "nodejs";

const bodySchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(48).optional(),
});

export async function POST(request: Request) {
  const started = performance.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Consulta inválida" }, { status: 400 });
  }

  try {
    const result = await searchProducts(parsed.data.query, parsed.data.limit);
    return NextResponse.json({
      success: true,
      data: {
        products: result.products,
        total_count: result.total_count,
        mode: result.mode,
        took_ms: Math.round(performance.now() - started),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Product search failed", error);
    return NextResponse.json(
      { success: false, error: "No se pudo completar la búsqueda" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
