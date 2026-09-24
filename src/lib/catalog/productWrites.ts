import "server-only";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { generateProductRAG, type ProductItemData } from "@/lib/rag/productRag";
import type { TagInput } from "@/types/products/product_form_data";

/**
 * Write helpers shared by createProduct (manual admin form) and publishDraft
 * (staging → public). Callers must have verified admin status.
 */

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Resolves tags to ids, creating missing ones.
 * strict: throws on the first creation error; otherwise the tag is skipped.
 */
export async function resolveTagIds(tags: TagInput[], strict = false): Promise<string[]> {
  const ids: string[] = [];
  for (const tag of tags) {
    if (tag.tagId) {
      ids.push(tag.tagId);
      continue;
    }
    const { data: existing } = await supabaseAdmin.from("tags").select("id").eq("slug", tag.slug).maybeSingle();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabaseAdmin
      .from("tags")
      .insert({ name: tag.name, slug: tag.slug })
      .select("id")
      .single();
    if (error || !created) {
      if (strict) throw new Error(`Failed to create tag '${tag.name}': ${error?.message}`);
      console.error("Error creating new tag:", error);
      continue;
    }
    ids.push(created.id);
  }
  return [...new Set(ids)];
}

export async function linkVariantTags(variantId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return;
  const { error } = await supabaseAdmin
    .from("variant_tags")
    .insert(tagIds.map((tag_id) => ({ variant_id: variantId, tag_id })));
  if (error) throw new Error(`Failed to create tags: ${error.message}`);
}

/**
 * Builds and stores RAG profiles for items of a product (optionally a subset).
 * Never throws: RAG can be regenerated later and must not block publishing.
 */
export async function generateRagForProduct(
  productId: string,
  opts: { itemIds?: string[]; enhanced_description?: string; enhanced_description_en?: string } = {},
): Promise<{ succeeded: number; failed: number }> {
  try {
    let query = supabaseAdmin
      .from("product_items")
      .select(
        `id, condition, price, stock, status,
         product_variants!inner (
           id, size, gender, fit, main_color_hex, metadata, product_id,
           products!inner ( id, name, description, brand, subcategory_id ),
           variant_color_categories ( label, representative_hex ),
           variant_tags ( tags ( name ) )
         )`,
      )
      .eq("product_variants.product_id", productId);
    if (opts.itemIds?.length) query = query.in("id", opts.itemIds);

    const { data: items, error } = await query;
    if (error || !items?.length) {
      if (error) console.error("Error querying items for RAG generation:", error);
      return { succeeded: 0, failed: 0 };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = items[0] as any;
    const subcategoryId: string | null = first.product_variants.products.subcategory_id;
    const { data: subcategory } = subcategoryId
      ? await supabaseAdmin.from("product_categories").select("name, parent_id").eq("id", subcategoryId).maybeSingle()
      : { data: null };
    const { data: category } = subcategory?.parent_id
      ? await supabaseAdmin.from("product_categories").select("name").eq("id", subcategory.parent_id).maybeSingle()
      : { data: null };

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.map((item: any) => {
        const variant = item.product_variants;
        const product = variant.products;
        const ragData: ProductItemData = {
          product_item_id: item.id,
          product_name: product.name,
          product_description: product.description || undefined,
          enhanced_description: opts.enhanced_description,
          enhanced_description_en: opts.enhanced_description_en,
          product_brand: product.brand || undefined,
          category_name: category?.name || "Unknown",
          subcategory_name: subcategory?.name || "Unknown",
          variant_size: variant.size || undefined,
          variant_gender: variant.gender || undefined,
          variant_fit: variant.fit || undefined,
          variant_main_color_hex: variant.main_color_hex,
          color_category_name: variant.variant_color_categories?.label || variant.main_color_hex,
          item_condition: item.condition || undefined,
          item_price: item.price,
          item_stock: item.stock || 0,
          item_status: item.status || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tags: variant.variant_tags?.map((vt: any) => vt.tags?.name).filter(Boolean) || [],
          variant_metadata: variant.metadata || undefined,
        };
        return generateProductRAG(ragData);
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    console.log(`✅ RAG generation complete: ${succeeded} succeeded, ${results.length - succeeded} failed`);
    return { succeeded, failed: results.length - succeeded };
  } catch (e) {
    console.error("RAG generation pipeline error:", e);
    return { succeeded: 0, failed: 0 };
  }
}
