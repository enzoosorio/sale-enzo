import "server-only";
import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Public catalog reads for SEO (metadata, sitemap, JSON-LD).
 * Uses a cookieless anonymous client so the sitemap can be statically
 * generated and revalidated; RLS already limits it to the public storefront.
 */

const SELLABLE_STATUSES = ["available", "reserved"];

export type SeoCategory = { id: string; name: string; slug: string; parentId: string | null };
export type SeoItem = { status: string | null; stock: number | null };
export type SeoProduct = { id: string; subcategoryId: string | null; updatedAt: string | null };

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const getSeoCategories = cache(async (): Promise<SeoCategory[]> => {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, slug, parent_id")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    parentId: (row.parent_id as string | null) ?? null,
  }));
});

/** Category and subcategory names for listing slugs, when they form a valid hierarchy. */
export async function resolveListingNames(category?: string, subcategory?: string) {
  if (!category) return { category: null, subcategory: null };
  const all = await getSeoCategories();
  const parent = all.find((c) => c.parentId === null && c.slug === category) ?? null;
  const child =
    parent && subcategory
      ? (all.find((c) => c.parentId === parent.id && c.slug === subcategory) ?? null)
      : null;
  return { category: parent, subcategory: child };
}

/** Subcategory trail and live item stock for one product's JSON-LD. */
export const getProductSeoContext = cache(async (productId: string) => {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select("subcategory_id, product_variants ( product_items ( status, stock ) )")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;

  const variants = (data.product_variants ?? []) as { product_items: SeoItem[] | null }[];
  const items = variants.flatMap((v) => v.product_items ?? []);
  const all = await getSeoCategories();
  const subcategory = all.find((c) => c.id === data.subcategory_id) ?? null;
  const category = subcategory ? (all.find((c) => c.id === subcategory.parentId) ?? null) : null;
  return { items, category, subcategory };
});

/** Active products with at least one sellable item (positive stock, available or reserved). */
export async function getSellableProducts(): Promise<SeoProduct[]> {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, subcategory_id, updated_at, product_variants!inner ( product_items!inner ( id ) )")
    .eq("is_active", true)
    .gt("product_variants.product_items.stock", 0)
    .in("product_variants.product_items.status", SELLABLE_STATUSES)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    subcategoryId: (row.subcategory_id as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}
