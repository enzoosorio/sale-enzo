import "server-only";

import { createClient } from "@/utils/supabase/server";
import { type WholeProductStructure } from "@/types/products/products";

export interface ProductsGridRpcParams {
  category?: string;
  subcategory?: string;
  tags?: string[];
  colors?: string[];
  brands?: string[];
  sizes?: string[];
  gender?: string;
  fit?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

interface RawGridPayloadRow {
  product: Omit<WholeProductStructure, "variant" | "item">;
  variant: WholeProductStructure["variant"];
  item: WholeProductStructure["item"];
}

interface RawProductsGridPayload {
  products: RawGridPayloadRow[];
  total_count: number;
}

export interface ProductsGridPayload {
  products: WholeProductStructure[];
  total_count: number;
}

const normalizeArray = (values?: string[]) => {
  if (!values || values.length === 0) return [];

  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
};

const normalizeLimit = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 24;
  return Math.max(1, Math.floor(value));
};

const normalizeOffset = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export async function getProductsForGrid(
  params: ProductsGridRpcParams,
): Promise<ProductsGridPayload> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_products_for_grid_v2", {
    p_category_slug: params.category?.trim().toLowerCase() || null,
    p_subcategory_slug: params.subcategory?.trim().toLowerCase() || null,
    p_selected_tags: normalizeArray(params.tags),
    p_selected_colors: normalizeArray(params.colors),
    p_selected_brands: normalizeArray(params.brands),
    p_selected_sizes: normalizeArray(params.sizes),
    p_gender: params.gender?.trim().toLowerCase() || null,
    p_fit: params.fit?.trim().toLowerCase() || null,
    p_min_price:
      typeof params.minPrice === "number" && Number.isFinite(params.minPrice)
        ? params.minPrice
        : null,
    p_max_price:
      typeof params.maxPrice === "number" && Number.isFinite(params.maxPrice)
        ? params.maxPrice
        : null,
    p_limit: normalizeLimit(params.limit),
    p_offset: normalizeOffset(params.offset),
  });

  if (error) {
    throw new Error(`RPC get_products_for_grid_v2 failed: ${error.message}`);
  }

  const fallback: RawProductsGridPayload = {
    products: [],
    total_count: 0,
  };

  const payload = (data ?? fallback) as RawProductsGridPayload;
  console.log("RAW RPC PAYLOAD", payload);
  const products = (payload.products || []).map((row) => ({
    ...row.product,
    variant: row.variant,
    item: row.item,
  }));

  return {
    products,
    total_count:
      typeof payload.total_count === "number" && Number.isFinite(payload.total_count)
        ? payload.total_count
        : products.length,
  };
}
