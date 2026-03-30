import "server-only";

import { createClient } from "@/utils/supabase/server";
import {
  type CategoryFiltersRpcParams,
  type CategoryFiltersRpcPayload,
} from "@/utils/filters/rpcCategoryFilters";

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

export async function getCategoryFiltersPayloadServer(
  params: CategoryFiltersRpcParams,
): Promise<CategoryFiltersRpcPayload> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_category_filters_payload", {
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
  });

  if (error) {
    throw new Error(`RPC get_category_filters_payload failed: ${error.message}`);
  }

  const fallback: CategoryFiltersRpcPayload = {
    available_filters: {
      tags: [],
      colors: [],
      sizes: [],
      brands: [],
      genders: [],
      fits: [],
      price_range: { min: null, max: null },
    },
    navigation: {
      categories: [],
      subcategories: [],
    },
    most_related_variant: null,
  };

  return (data ?? fallback) as CategoryFiltersRpcPayload;
}
