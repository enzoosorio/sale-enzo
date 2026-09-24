"use server";

import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { computeMissingFields, conditionLabel, EMPTY_DRAFT_FIELDS, MIN_DONE_IMAGES, type DraftFields } from "@/lib/catalog/schema";
import { generateRagForProduct, linkVariantTags, resolveTagIds, slugify } from "@/lib/catalog/productWrites";
import { publicUrl } from "@/lib/r2";
import { getDraft, staging } from "@/lib/staging/db";
import { orderedDoneImages, publicVariantMetadata } from "@/lib/staging/draftToPreview";
import { getOrCreateColorCluster, processSecondaryColors } from "@/utils/colors/clustering";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import type { DraftWithImages } from "@/types/staging";

type PublishResult =
  | { success: true; productId: string; variantId: string; itemId: string }
  | { success: false; error: string; missing?: string[] };

const toFields = (d: DraftWithImages): DraftFields => {
  const f = { ...EMPTY_DRAFT_FIELDS };
  for (const k of Object.keys(EMPTY_DRAFT_FIELDS) as (keyof DraftFields)[]) {
    (f as Record<string, unknown>)[k] = d[k] ?? EMPTY_DRAFT_FIELDS[k];
  }
  for (const k of ["condition_score", "price", "compare_at_price"] as const) {
    if (f[k] !== null) (f as Record<string, unknown>)[k] = Number(f[k]);
  }
  return f;
};

/** Checks everything publishDraft needs; also used by the UI to enable the button. */
export async function validateForPublish(draft: DraftWithImages): Promise<{ missing: string[]; blockers: string[] }> {
  const missing = computeMissingFields(toFields(draft));
  const blockers: string[] = [];
  const done = orderedDoneImages(draft.images).length;
  if (done < MIN_DONE_IMAGES) blockers.push(`Se necesitan al menos ${MIN_DONE_IMAGES} fotos procesadas (hay ${done})`);
  if (draft.status === "published") blockers.push("Ya está publicado");
  if (draft.status === "discarded") blockers.push("Está descartado");
  return { missing, blockers };
}

/**
 * Publishes a staging draft into products → product_variants → product_items.
 * Private data (specs, defects, price notes) goes to product_item_notes (admin-only RLS).
 * Manual rollback on failure, mirroring createProduct.
 */
export async function publishDraft(draftId: string): Promise<PublishResult> {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return { success: false, error: "Unauthorized: Admin access required" };

  const draft = await getDraft(draftId);
  if (!draft) return { success: false, error: "Draft not found" };

  const { missing, blockers } = await validateForPublish(draft);
  if (missing.length || blockers.length) {
    return { success: false, error: [...blockers, missing.length ? `Faltan: ${missing.join(", ")}` : ""].filter(Boolean).join(". "), missing };
  }
  const f = toFields(draft);

  // Resolve the attachment point (sibling drafts must be published first)
  let productId = f.target_product_id;
  let variantId = f.match_kind === "new_item" ? f.target_variant_id : null;
  if (f.target_draft_id) {
    const parent = await getDraft(f.target_draft_id);
    if (!parent?.published_product_id) {
      return { success: false, error: `Publica primero ${parent?.sku ?? "el borrador padre"}: este es una ${f.match_kind === "new_item" ? "unidad" : "variante"} de ese producto.` };
    }
    productId = parent.published_product_id;
    if (f.match_kind === "new_item") variantId = parent.published_variant_id;
  }
  if (f.match_kind === "new_item" && variantId && !productId) {
    const { data } = await supabaseAdmin.from("product_variants").select("product_id").eq("id", variantId).single();
    productId = data?.product_id ?? null;
  }

  const created: { product?: string; variant?: string; item?: string } = {};
  const rollback = async () => {
    if (created.item) await supabaseAdmin.from("product_items").delete().eq("id", created.item);
    if (created.variant) {
      await supabaseAdmin.from("variant_images").delete().eq("variant_id", created.variant);
      await supabaseAdmin.from("variant_tags").delete().eq("variant_id", created.variant);
      await supabaseAdmin.from("variant_colors").delete().eq("variant_id", created.variant);
      await supabaseAdmin.from("product_variants").delete().eq("id", created.variant);
    }
    if (created.product) await supabaseAdmin.from("products").delete().eq("id", created.product);
  };

  try {
    // 1. Product
    if (f.match_kind === "new_product") {
      const { data, error } = await supabaseAdmin
        .from("products")
        .insert({ name: f.name, description: f.description, brand: f.brand, subcategory_id: f.subcategory_id, is_active: true })
        .select("id")
        .single();
      if (error || !data) throw new Error(`Producto: ${error?.message}`);
      productId = created.product = data.id;
    }
    if (!productId) throw new Error("No se pudo resolver el producto destino");

    // 2. Variant (+ color clusters, tags, images)
    const images = orderedDoneImages(draft.images);
    if (f.match_kind !== "new_item") {
      const cluster = await getOrCreateColorCluster(f.main_color_hex!);
      const { data, error } = await supabaseAdmin
        .from("product_variants")
        .insert({
          product_id: productId,
          size: f.size,
          gender: f.gender,
          fit: f.fit,
          main_img_url: publicUrl(images[0].cutout_web_key!),
          main_color_hex: f.main_color_hex,
          main_color_category_id: cluster.color_category_id,
          metadata: publicVariantMetadata(f),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`Variante: ${error?.message}`);
      variantId = created.variant = data.id;

      if (f.secondary_colors.length) await processSecondaryColors(data.id, f.secondary_colors);

      const tagIds = await resolveTagIds(f.tags.map((name) => ({ name, slug: slugify(name) })));
      await linkVariantTags(data.id, tagIds);

      const { error: imagesError } = await supabaseAdmin.from("variant_images").insert(
        images.map((img, i) => ({
          variant_id: data.id,
          image_url: publicUrl(img.cutout_web_key!),
          cutout_full_url: img.cutout_key ? publicUrl(img.cutout_key) : null,
          original_key: img.original_key,
          position: String(i + 1),
        })),
      );
      if (imagesError) throw new Error(`Imágenes: ${imagesError.message}`);
    }
    if (!variantId) throw new Error("No se pudo resolver la variante destino");

    // 3. Item
    const { data: item, error: itemError } = await supabaseAdmin
      .from("product_items")
      .insert({
        variant_id: variantId,
        condition: conditionLabel(f.condition_score!),
        condition_score: f.condition_score,
        condition_note: f.condition_note,
        price: f.price,
        compare_at_price: f.compare_at_price,
        sku: draft.sku,
        stock: f.stock,
        seller_id: adminUserId,
        status: "available",
      })
      .select("id")
      .single();
    if (itemError || !item) throw new Error(`Item: ${itemError?.message}`);
    created.item = item.id;

    // 4. Private notes (never read by the storefront)
    const { error: notesError } = await supabaseAdmin.from("product_item_notes").insert({
      item_id: item.id,
      specs_raw: f.specs_raw,
      defects: f.defects,
      price_notes: f.price_notes,
      internal_notes: f.internal_notes,
      source_draft_id: draft.id,
    });
    if (notesError) throw new Error(`Notas privadas: ${notesError.message}`);

    // 5. Mark draft as published
    const { error: draftError } = await staging()
      .from("product_drafts")
      .update({
        status: "published",
        published_product_id: productId,
        published_variant_id: variantId,
        published_item_id: item.id,
        published_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    if (draftError) throw new Error(`Draft: ${draftError.message}`);

    // 6. Semantic profile (non-blocking by contract)
    await generateRagForProduct(productId, { itemIds: [item.id] });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/admin/staging");
    revalidatePath("/admin/products");
    return { success: true, productId, variantId, itemId: item.id };
  } catch (e) {
    await rollback();
    const error = e instanceof Error ? e.message : String(e);
    console.error("publishDraft failed:", error);
    return { success: false, error };
  }
}

/** Publishes several drafts, parents before the siblings that attach to them. */
export async function publishDrafts(draftIds: string[]): Promise<{ id: string; result: PublishResult }[]> {
  if (!(await getAdminUserId())) return draftIds.map((id) => ({ id, result: { success: false, error: "Unauthorized" } }));

  const { data } = await staging().from("product_drafts").select("id, target_draft_id").in("id", draftIds);
  const pending = new Map((data ?? []).map((d) => [d.id as string, d.target_draft_id as string | null]));
  const ordered: string[] = [];
  while (pending.size) {
    const ready = [...pending].filter(([, parent]) => !parent || !pending.has(parent)).map(([id]) => id);
    if (!ready.length) break; // cycle guard
    for (const id of ready) {
      ordered.push(id);
      pending.delete(id);
    }
  }

  const results: { id: string; result: PublishResult }[] = [];
  for (const id of [...ordered, ...pending.keys()]) {
    results.push({ id, result: await publishDraft(id) });
  }
  return results;
}
