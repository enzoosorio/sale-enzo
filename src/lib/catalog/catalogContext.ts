import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogProduct, ExtractionContext, TaxonomyNode } from "./extract";

/**
 * Loads the extraction context: closed taxonomy, brand list and a compact
 * catalog (published products + unpublished drafts) for segmentation.
 * Takes a service-role client so it works from routes and CLI scripts.
 */
export async function loadExtractionContext(
  db: SupabaseClient,
  opts: { excludeDraftId?: string } = {},
): Promise<ExtractionContext> {
  const [categories, brands, products, drafts] = await Promise.all([
    db.from("product_categories").select("id, name, slug, parent_id").order("name"),
    db.from("brands").select("name").order("name"),
    db
      .from("products")
      .select("id, name, brand, subcategory_id, product_variants(id, size, gender, fit, main_color_hex, metadata)")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .schema("staging")
      .from("product_drafts")
      .select("id, name, brand, subcategory_id, size, gender, fit, main_color_hex, metadata, target_draft_id, match_kind")
      .in("status", ["capturing", "pending_review", "approved"])
      .order("created_at", { ascending: true }),
  ]);

  for (const r of [categories, brands, products, drafts]) {
    if (r.error) throw new Error(`loadExtractionContext: ${r.error.message}`);
  }

  return {
    taxonomy: buildTaxonomy(categories.data ?? []),
    brands: (brands.data ?? []).map((b) => b.name as string),
    catalog: [
      ...publishedCatalog(products.data ?? []),
      ...draftCatalog((drafts.data ?? []).filter((d) => d.id !== opts.excludeDraftId)),
    ],
  };
}

type CategoryRow = { id: string; name: string; slug: string; parent_id: string | null };

export function buildTaxonomy(rows: CategoryRow[]): TaxonomyNode[] {
  return rows
    .filter((c) => c.parent_id === null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      children: rows
        .filter((s) => s.parent_id === c.id)
        .map(({ id, name, slug }) => ({ id, name, slug })),
    }))
    .filter((c) => c.children.length > 0);
}

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  subcategory_id: string | null;
  product_variants: {
    id: string;
    size: string | null;
    gender: string | null;
    fit: string | null;
    main_color_hex: string | null;
    metadata: Record<string, string> | null;
  }[];
};

function publishedCatalog(rows: ProductRow[]): CatalogProduct[] {
  return rows.map((p) => ({
    ref: `p:${p.id}`,
    name: p.name,
    brand: p.brand,
    subcategory_id: p.subcategory_id,
    variants: p.product_variants.map((v) => ({
      ref: `v:${v.id}`,
      size: v.size,
      gender: v.gender,
      fit: v.fit,
      color: v.main_color_hex,
      metadata: v.metadata ?? {},
    })),
  }));
}

type DraftRow = {
  id: string;
  name: string | null;
  brand: string | null;
  subcategory_id: string | null;
  size: string | null;
  gender: string | null;
  fit: string | null;
  main_color_hex: string | null;
  metadata: Record<string, string> | null;
  target_draft_id: string | null;
  match_kind: string | null;
};

/**
 * Each draft is one variant. Drafts that attach to a sibling draft are listed
 * under that sibling's product so the model sees the grouping built so far.
 */
export function draftCatalog(rows: DraftRow[]): CatalogProduct[] {
  const roots = rows.filter((d) => !d.target_draft_id || d.match_kind === "new_product");
  const byRoot = new Map(roots.map((r) => [r.id, [r] as DraftRow[]]));
  for (const d of rows) {
    if (d.target_draft_id && d.match_kind !== "new_product") byRoot.get(d.target_draft_id)?.push(d);
  }

  return roots
    .filter((r) => r.name)
    .map((r) => ({
      ref: `dp:${r.id}`,
      name: r.name as string,
      brand: r.brand,
      subcategory_id: r.subcategory_id,
      variants: (byRoot.get(r.id) ?? [r]).map((d) => ({
        ref: `dv:${d.id}`,
        size: d.size,
        gender: d.gender,
        fit: d.fit,
        color: d.main_color_hex,
        metadata: d.metadata ?? {},
      })),
    }));
}
