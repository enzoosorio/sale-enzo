import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  buildDeterministicRagContent,
  buildSearchText,
  type ProductItemData,
} from "../src/lib/rag/ragContent";

config({ path: ".env.local" });
config({ path: ".env" });

const force = process.argv.includes("--all");
const dryRun = process.argv.includes("--dry-run");
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");

const db = createClient(url, key, { auth: { persistSession: false } });

interface ItemRow {
  id: string;
  condition: string | null;
  price: number;
  stock: number | null;
  status: string | null;
  product_variants: {
    size: string | null;
    gender: string | null;
    fit: string | null;
    main_color_hex: string;
    metadata: Record<string, string> | null;
    products: {
      name: string;
      description: string | null;
      brand: string | null;
      subcategory_id: string | null;
    };
    variant_color_categories: { label: string | null } | null;
    variant_tags: { tags: { name: string } | null }[];
  };
}

interface ProfileRow {
  product_item_id: string;
  content: string;
  search_text: string;
  embedding: string | number[] | null;
  version: number | null;
}

async function main() {
const categoriesResult = await db.from("product_categories").select("id,name,parent_id");
if (categoriesResult.error) throw categoriesResult.error;
const categories = new Map((categoriesResult.data ?? []).map((category) => [category.id, category]));

const profiles = new Map<string, ProfileRow>();
for (let from = 0; ; from += 500) {
  const { data, error } = await db.from("product_rag_profiles")
    .select("product_item_id,content,search_text,embedding,version")
    .order("product_item_id")
    .range(from, from + 499);
  if (error) throw error;
  const page = (data ?? []) as ProfileRow[];
  for (const profile of page) profiles.set(profile.product_item_id, profile);
  if (page.length < 500) break;
}

const select = `id, condition, price, stock, status,
  product_variants!inner (
    size, gender, fit, main_color_hex, metadata,
    products!inner (name, description, brand, subcategory_id),
    variant_color_categories (label),
    variant_tags (tags (name))
  )`;

const items: ItemRow[] = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await db.from("product_items").select(select)
    .order("id")
    .range(from, from + 499);
  if (error) throw error;
  const page = (data ?? []) as unknown as ItemRow[];
  items.push(...page);
  if (page.length < 500) break;
}

const pending: {
  item: ItemRow;
  content: string;
  searchText: string;
  version: number;
}[] = [];
let skipped = 0;
let textOnly = 0;

for (const item of items) {
  const variant = item.product_variants;
  const product = variant.products;
  const subcategory = categories.get(product.subcategory_id ?? "");
  const category = categories.get(subcategory?.parent_id ?? "");
  const ragData: ProductItemData = {
    product_item_id: item.id,
    product_name: product.name,
    product_description: product.description ?? undefined,
    product_brand: product.brand ?? undefined,
    category_name: category?.name ?? "Sin categoría",
    subcategory_name: subcategory?.name ?? "Sin subcategoría",
    variant_size: variant.size ?? undefined,
    variant_gender: variant.gender ?? undefined,
    variant_fit: variant.fit ?? undefined,
    variant_main_color_hex: variant.main_color_hex,
    color_category_name: variant.variant_color_categories?.label ?? undefined,
    item_condition: item.condition ?? undefined,
    item_price: item.price,
    item_stock: item.stock ?? 0,
    item_status: item.status ?? undefined,
    tags: variant.variant_tags.map((link) => link.tags?.name).filter((name): name is string => Boolean(name)),
    variant_metadata: variant.metadata ?? undefined,
  };
  const content = buildDeterministicRagContent(ragData);
  const searchText = buildSearchText(ragData);
  const existing = profiles.get(item.id);

  if (!force && existing?.embedding && existing.content === content) {
    if (existing.search_text !== searchText) {
      textOnly++;
      if (!dryRun) {
        const { error } = await db.from("product_rag_profiles")
          .update({ search_text: searchText }).eq("product_item_id", item.id);
        if (error) throw error;
      }
    } else {
      skipped++;
    }
    continue;
  }
  pending.push({ item, content, searchText, version: (existing?.version ?? 0) + 1 });
}

console.log(`Items: ${items.length}; embed: ${pending.length}; text only: ${textOnly}; skipped: ${skipped}`);
if (dryRun || pending.length === 0) process.exit(0);

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required to embed pending items");
const openai = new OpenAI({ apiKey });

for (let from = 0; from < pending.length; from += 100) {
  const batch = pending.slice(from, from + 100);
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: batch.map((entry) => entry.content),
    encoding_format: "float",
  });
  if (response.data.length !== batch.length) throw new Error("OpenAI returned an incomplete embedding batch");
  const embeddings = new Map(response.data.map((entry) => [entry.index, entry.embedding]));
  const rows = batch.map((entry, index) => {
    const embedding = embeddings.get(index);
    if (!embedding || embedding.length !== 1536) throw new Error(`Invalid embedding for ${entry.item.id}`);
    return {
      product_item_id: entry.item.id,
      content: entry.content,
      search_text: entry.searchText,
      embedding,
      metadata: entry.item.product_variants.metadata,
      version: entry.version,
    };
  });
  const { error } = await db.from("product_rag_profiles").upsert(rows, { onConflict: "product_item_id" });
  if (error) throw error;
  console.log(`Indexed ${Math.min(from + batch.length, pending.length)}/${pending.length}`);
}
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
