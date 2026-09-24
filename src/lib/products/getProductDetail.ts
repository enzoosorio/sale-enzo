import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type { ProductDetailData } from "@/components/products/ProductDetailView";

/**
 * Public product detail. Reads only storefront tables; private notes
 * (product_item_notes) are never selected here.
 */

type VariantRow = {
  id: string;
  size: string | null;
  gender: string | null;
  fit: string | null;
  main_img_url: string | null;
  metadata: Record<string, string> | null;
  variant_images: { image_url: string; position: string | number | null }[];
  product_items: {
    id: string;
    price: number | string;
    compare_at_price: number | string | null;
    condition_score: number | string | null;
    condition_note: string | null;
    sku: string | null;
    stock: number | null;
    status: string | null;
  }[];
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const VISIBLE_STATUSES = ["available", "reserved"];

export const getProductDetail = cache(async (productId: string, variantId?: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, brand, description, is_active,
       product_variants (
         id, size, gender, fit, main_img_url, metadata,
         variant_images ( image_url, position ),
         product_items ( id, price, compare_at_price, condition_score, condition_note, sku, stock, status )
       )`,
    )
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const variants = (data.product_variants as VariantRow[])
    .map((v) => ({
      ...v,
      item: v.product_items
        .filter((i) => (i.stock ?? 0) > 0 && VISIBLE_STATUSES.includes(i.status ?? "available"))
        .sort((a, b) => Number(a.price) - Number(b.price))[0],
    }))
    .filter((v) => v.item)
    .sort((a, b) => SIZE_ORDER.indexOf(a.size ?? "") - SIZE_ORDER.indexOf(b.size ?? ""));

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  if (!variant) return null;

  const meta = variant.metadata ?? {};
  const fitsLike =
    meta.fits_like_min && meta.fits_like_max && meta.fits_like_min !== meta.fits_like_max
      ? `${meta.fits_like_min}–${meta.fits_like_max}`
      : (meta.fits_like_min ?? null);

  const gallery = [...variant.variant_images]
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((i) => i.image_url);
  const images = [variant.main_img_url, ...gallery]
    .filter((src): src is string => !!src)
    .filter((src, i, all) => all.indexOf(src) === i)
    .map((src) => ({ src, alt: data.name }));

  const detail: ProductDetailData = {
    name: data.name,
    brand: data.brand,
    description: data.description,
    size: variant.size,
    fitsLike,
    gender: variant.gender,
    fit: variant.fit,
    price: Number(variant.item.price),
    compareAtPrice: variant.item.compare_at_price ? Number(variant.item.compare_at_price) : null,
    conditionScore: variant.item.condition_score !== null ? Number(variant.item.condition_score) : null,
    conditionNote: variant.item.condition_note,
    status: variant.item.status ?? "available",
    stock: variant.item.stock ?? 1,
    sku: variant.item.sku,
    metadata: meta,
    images,
    siblings:
      variants.length > 1
        ? variants.map((v) => ({
            id: v.id,
            label: v.size ?? "Única",
            href: `/products/${data.id}?variant=${v.id}`,
            active: v.id === variant.id,
          }))
        : undefined,
  };
  return detail;
});
