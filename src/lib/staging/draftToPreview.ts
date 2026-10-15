import type { ProductDetailData } from "@/components/products/ProductDetailView";
import type { WholeProductStructure } from "@/types/products/products";
import type { DraftImageRow, DraftRow } from "@/types/staging";
import { roleRank } from "@/lib/capture/photoSlots";
import { conditionLabel } from "@/lib/catalog/schema";

type MediaUrl = (key: string | null) => string | null;

type ShippableImage = Pick<
  DraftImageRow,
  "cutout_key" | "cutout_web_key" | "ironed_status" | "ironed_key" | "ironed_web_key"
>;

/**
 * R2 keys that actually ship for a photo: the ironed rendition once the owner
 * accepted it, otherwise the plain cutout. The original and the plain cutout stay
 * in R2 either way (the future ComfyUI pipeline starts from them).
 */
export function shippedKeys(img: ShippableImage): { web: string | null; full: string | null } {
  if (img.ironed_status === "accepted" && img.ironed_web_key) {
    return { web: img.ironed_web_key, full: img.ironed_key ?? img.ironed_web_key };
  }
  return { web: img.cutout_web_key, full: img.cutout_key };
}

/** Draft images in display order: main first, then by slot (front, back, label…), then position. Only finished ones. */
export function orderedDoneImages(images: DraftImageRow[]): DraftImageRow[] {
  return images
    .filter((i) => i.status === "done" && i.cutout_web_key)
    .sort(
      (a, b) =>
        Number(b.is_main) - Number(a.is_main) ||
        roleRank(a.shot_role) - roleRank(b.shot_role) ||
        a.position - b.position,
    );
}

/** Variant metadata as persisted in product_variants.metadata (public). Defects never go here. */
export function publicVariantMetadata(d: Pick<DraftRow, "metadata" | "also_unisex" | "fits_like_min" | "fits_like_max">) {
  const meta: Record<string, string> = { ...(d.metadata as Record<string, string>) };
  if (d.also_unisex) meta.also_unisex = "true";
  if (d.fits_like_min) meta.fits_like_min = d.fits_like_min;
  if (d.fits_like_max) meta.fits_like_max = d.fits_like_max;
  return meta;
}

/** Shape consumed by ProductCard (grid). */
export function draftToCard(draft: DraftRow, images: DraftImageRow[], mediaUrl: MediaUrl): WholeProductStructure {
  const main = orderedDoneImages(images)[0];
  return {
    id: draft.id,
    name: draft.name ?? "Sin nombre",
    description: draft.description,
    brand: draft.brand ?? "",
    category_id: draft.category_id,
    is_active: true,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
    variant: {
      id: draft.id,
      product_id: draft.id,
      size: draft.size,
      main_color_hex: draft.main_color_hex,
      main_color_category_id: null,
      main_img_url: mediaUrl(main ? shippedKeys(main).web : null),
      gender: draft.gender,
      fit: draft.fit,
      metadata: publicVariantMetadata(draft),
      created_at: draft.created_at,
    },
    item: {
      id: draft.id,
      variant_id: draft.id,
      condition: draft.condition_score ? conditionLabel(Number(draft.condition_score)) : "used",
      price: Number(draft.price ?? 0),
      compare_at_price: draft.compare_at_price ? Number(draft.compare_at_price) : null,
      condition_score: draft.condition_score ? Number(draft.condition_score) : null,
      condition_note: draft.condition_note,
      sku: draft.sku,
      stock: draft.stock,
      seller_id: null,
      status: "active",
      created_at: draft.created_at,
    },
  };
}

/** Shape consumed by ProductDetailView (detail page). */
export function draftToDetail(draft: DraftRow, images: DraftImageRow[], mediaUrl: MediaUrl): ProductDetailData {
  const fitsLike =
    draft.fits_like_min && draft.fits_like_max && draft.fits_like_min !== draft.fits_like_max
      ? `${draft.fits_like_min}–${draft.fits_like_max}`
      : draft.fits_like_min;

  return {
    name: draft.name ?? "Sin nombre",
    brand: draft.brand,
    description: draft.description,
    size: draft.size,
    fitsLike,
    gender: draft.gender,
    fit: draft.fit,
    price: Number(draft.price ?? 0),
    compareAtPrice: draft.compare_at_price ? Number(draft.compare_at_price) : null,
    conditionScore: draft.condition_score !== null ? Number(draft.condition_score) : null,
    conditionNote: draft.condition_note,
    status: "available",
    stock: draft.stock,
    sku: draft.sku,
    metadata: draft.metadata as Record<string, string>,
    images: orderedDoneImages(images)
      .map((i) => mediaUrl(shippedKeys(i).web))
      .filter((src): src is string => !!src)
      .map((src) => ({ src, alt: draft.name ?? draft.sku })),
  };
}

/** Plain-text listing for Facebook Marketplace. Includes the tactful condition note. */
export function marketplaceText(draft: DraftRow): string {
  const meta = draft.metadata as Record<string, string>;
  const lines = [
    draft.name,
    draft.price ? `S/ ${Number(draft.price)}${draft.compare_at_price ? ` (antes S/ ${Number(draft.compare_at_price)})` : ""}` : null,
    [draft.size && `Talla ${draft.size}`, draft.fits_like_min && `le queda ${draft.fits_like_min}${draft.fits_like_max && draft.fits_like_max !== draft.fits_like_min ? `–${draft.fits_like_max}` : ""}`]
      .filter(Boolean)
      .join(", "),
    draft.condition_score ? `Estado ${Number(draft.condition_score)}/10. ${draft.condition_note ?? ""}`.trim() : null,
    draft.description,
    [meta.technology, meta.team, meta.university, meta.player].filter(Boolean).join(" · ") || null,
    draft.tags.length ? draft.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ") : null,
    `Ref: ${draft.sku}`,
  ];
  return lines.filter(Boolean).join("\n");
}
