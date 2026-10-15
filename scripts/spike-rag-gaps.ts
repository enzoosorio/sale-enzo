/** Read-only: which published items have no RAG profile, and when were they created? */
import "dotenv/config";
import { supabaseAdmin } from "../src/utils/supabase/supabase-admin";

async function main() {
  const [{ data: items, error: e1 }, { data: profiles, error: e2 }, { data: drafts, error: e3 }] = await Promise.all([
    supabaseAdmin.from("product_items").select("id, sku, created_at, status").order("created_at", { ascending: true }).limit(1000),
    supabaseAdmin.from("product_rag_profiles").select("product_item_id, updated_at").limit(1000),
    supabaseAdmin.schema("staging").from("product_drafts").select("id, sku, published_item_id, published_at").eq("status", "published"),
  ]);
  for (const e of [e1, e2, e3]) if (e) throw new Error(e.message);

  const have = new Set((profiles ?? []).map((p) => p.product_item_id as string));
  const missing = (items ?? []).filter((i) => !have.has(i.id as string));
  const byMonth = (rows: { created_at: string }[]) =>
    Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r.created_at.slice(0, 7)] = (m[r.created_at.slice(0, 7)] ?? 0) + 1), m), {}))
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");

  console.log(`items: ${items?.length} | con perfil: ${have.size} | sin perfil: ${missing.length}`);
  console.log(`sin perfil por mes de creación: ${byMonth(missing as { created_at: string }[])}`);
  console.log(`con perfil por mes de creación: ${byMonth((items ?? []).filter((i) => have.has(i.id as string)) as { created_at: string }[])}`);

  const published = drafts ?? [];
  const publishedMissing = published.filter((d) => d.published_item_id && !have.has(d.published_item_id as string));
  console.log(`\nborradores publicados con el wizard: ${published.length} | de esos, sin perfil semántico: ${publishedMissing.length}`);
  for (const d of publishedMissing.slice(0, 10)) console.log(`   ${d.sku}  publicado ${String(d.published_at).slice(0, 10)}`);

  const byStatus = missing.reduce<Record<string, number>>((m, i) => ((m[i.status as string] = (m[i.status as string] ?? 0) + 1), m), {});
  console.log(`\nsin perfil por estado del item: ${JSON.stringify(byStatus)}`);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
