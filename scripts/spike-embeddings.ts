/**
 * Spike: does the embedding/search chain work on YOUR data? Writes NOTHING to the database.
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/spike-embeddings.ts
 *
 *  1. Remote DB (read-only): how many items have a RAG profile, dimension of a stored vector,
 *     and the real `search_products_hybrid` RPC on a few queries.
 *  2. Offline: builds the 14 eval garments with the production content builder, embeds them
 *     with the production embedding call and checks that natural Spanish queries find the right one.
 */
import "dotenv/config"; // first: the modules below read env at import time
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { conditionLabel } from "../src/lib/catalog/schema";
import { buildDeterministicRagContent, type ProductItemData } from "../src/lib/rag/ragContent";
import { generateEmbedding } from "../src/lib/rag/productRag";
import { embedQuery } from "../src/lib/search/embedQuery";
import { normalizeCondition, normalizeGender, normalizePrice, normalizeSize } from "../src/lib/staging/normalizers";
import { supabaseAdmin } from "../src/utils/supabase/supabase-admin";

const DIR = "scripts/fixtures/eval-data";
const cosine = (a: number[], b: number[]) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

async function remote() {
  console.log("== 1. Base remota (solo lectura)");
  const count = async (table: string) => {
    const { count, error } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };
  const [items, profiles] = await Promise.all([count("product_items"), count("product_rag_profiles")]);
  console.log(`   product_items: ${items} | product_rag_profiles: ${profiles}${items > profiles ? `  ⚠ ${items - profiles} sin perfil semántico` : ""}`);

  const { data: sample } = await supabaseAdmin.from("product_rag_profiles").select("product_item_id, embedding, updated_at").limit(1);
  if (sample?.[0]) {
    const v = sample[0].embedding as unknown;
    const dims = typeof v === "string" ? v.split(",").length : Array.isArray(v) ? v.length : 0;
    console.log(`   vector guardado: ${dims} dimensiones (updated_at ${sample[0].updated_at})`);
  } else console.log("   no hay perfiles guardados todavía");

  if (items === 0) return;
  for (const q of ["polo nike dri fit", "camiseta deportiva gris", "polera north face manga larga"]) {
    const t = performance.now();
    const emb = await embedQuery(q);
    const { data, error } = await supabaseAdmin.rpc("search_products_hybrid", {
      p_query: q.toLowerCase(),
      p_query_embedding: `[${emb.join(",")}]`,
      p_match_count: 3,
    });
    if (error) { console.log(`   "${q}": RPC error ${error.message}`); continue; }
    const rows = ((data as { products?: { product: { name: string }; score: number }[] })?.products ?? []).map((r) => `${r.product.name} (${r.score.toFixed(3)})`);
    console.log(`   "${q}" -> ${Math.round(performance.now() - t)} ms: ${rows.join(" | ") || "sin resultados"}`);
  }
}

async function readRows(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.getWorksheet("PRODUCTOS") ?? wb.worksheets[0];
  let header: string[] | null = null;
  const rows = new Map<number, Record<string, unknown>>();
  sheet.eachRow((r, n) => {
    const values = (r.values as unknown[]).slice(1).map((v) => (v && typeof v === "object" && "result" in v ? (v as { result: unknown }).result : v));
    if (!header) {
      if (values.some((v) => String(v ?? "").trim() === "especificaciones")) header = values.map((v) => String(v ?? "").trim());
      return;
    }
    rows.set(n, Object.fromEntries(header.map((h, i) => [h, values[i] ?? null]).filter(([h]) => h)));
  });
  return rows;
}

const COLOR_ES: Record<string, string> = { negro: "Negro", blanco: "Blanco", gris: "Gris", azul: "Azul", lila: "Lila", verde: "Verde", "rojo-naranja": "Rojo anaranjado", aqua: "Aqua", arena: "Arena" };

/** query -> photos (by number) that are a correct answer */
const QUERIES: [string, number[]][] = [
  ["polo negro manga larga nike dri fit", [1]],
  ["camiseta de oregon ducks", [2]],
  ["polo blanco manga larga para entrenar", [4]],
  ["polo the north face manga larga gris", [7]],
  ["polo north face rojo anaranjado", [8]],
  ["polo gymshark aqua", [9]],
  ["polo under armour deportivo", [6, 10]],
  ["jersey de béisbol de mujer new york", [13]],
  ["polo gris con rombos nike", [12]],
  ["camiseta nike dri-fit gris", [3, 12, 14]],
];

async function offline() {
  console.log("\n== 2. Embeddings de tus 14 prendas con el constructor de producción (sin escribir)");
  const mapping = JSON.parse(await readFile(path.join(DIR, "mapping.json"), "utf8")) as Record<string, { row: number; color: string[] }>;
  const rows = await readRows(path.join(DIR, "SALE ENZO (1).xlsx"));

  const docs: { n: number; name: string; content: string; embedding: number[] }[] = [];
  for (const [file, m] of Object.entries(mapping).filter(([k]) => k.endsWith(".jpeg"))) {
    const row = rows.get(m.row)!;
    const n = Number(file.replace(/\D/g, ""));
    const { gender } = normalizeGender(row.gender);
    const price = normalizePrice(row["posible precio"]).price ?? 49;
    const condition = normalizeCondition(row.condition) ?? 10;
    const long = /larga/i.test(String(row.subcategory));
    const meta = String(row.metadata ?? "");
    const data: ProductItemData = {
      product_item_id: `spike-${n}`,
      product_name: String(row.name).trim(),
      product_brand: String(row.brand).trim(),
      category_name: "Polos",
      subcategory_name: long ? "Polos manga larga" : "Polos manga corta",
      variant_size: normalizeSize(row.size) ?? undefined,
      variant_gender: gender ?? undefined,
      variant_main_color_hex: "#808080",
      color_category_name: COLOR_ES[m.color[0]] ?? undefined,
      item_condition: conditionLabel(condition),
      item_price: price,
      item_stock: 1,
      tags: [],
      variant_metadata: /dri ?fit/i.test(`${row.name} ${meta}`) ? { technology: "Dri-FIT" } : undefined,
    };
    const content = buildDeterministicRagContent(data);
    docs.push({ n, name: data.product_name, content, embedding: await generateEmbedding(content) });
  }
  docs.sort((a, b) => a.n - b.n);
  console.log(`   ${docs.length} documentos, ${docs[0].embedding.length} dimensiones cada uno, ~${Math.round(docs.reduce((s, d) => s + d.content.length, 0) / docs.length)} caracteres de texto`);
  console.log(`   Ejemplo (polow${docs[1].n}):\n${docs[1].content.split("\n").slice(0, 9).map((l) => `     ${l}`).join("\n")}`);

  let top1 = 0, top3 = 0;
  for (const [q, ok] of QUERIES) {
    const emb = await embedQuery(q);
    const ranked = docs.map((d) => ({ d, s: cosine(emb, d.embedding) })).sort((a, b) => b.s - a.s);
    const hit1 = ok.includes(ranked[0].d.n);
    const hit3 = ranked.slice(0, 3).some((r) => ok.includes(r.d.n));
    top1 += Number(hit1);
    top3 += Number(hit3);
    console.log(`   ${hit1 ? "✓" : hit3 ? "~" : "✗"} "${q}" -> #1 polow${ranked[0].d.n} (${ranked[0].s.toFixed(3)}) | esperado ${ok.map((n) => `polow${n}`).join("/")}`);
  }
  console.log(`   Top-1: ${top1}/${QUERIES.length} | Top-3: ${top3}/${QUERIES.length}`);
}

async function main() {
  await remote();
  await offline();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
