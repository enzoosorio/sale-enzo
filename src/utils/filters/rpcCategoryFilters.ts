import { createClient } from "@/utils/supabase/client";

export interface CategoryFilterOptionWithCount {
  value: string;
  count: number;
}

export interface RpcTagFilter {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface RpcColorFilter {
  id: string;
  label: string;
  representative_hex: string;
  count: number;
}

export interface RpcPriceRange {
  min: number | null;
  max: number | null;
}

export interface RpcNavigationNode {
  slug: string;
  name: string;
  count: number;
}

export interface RpcNavigation {
  categories: RpcNavigationNode[];
  subcategories: RpcNavigationNode[];
}

export interface RpcAvailableFilters {
  tags: RpcTagFilter[];
  colors: RpcColorFilter[];
  sizes: CategoryFilterOptionWithCount[];
  brands: CategoryFilterOptionWithCount[];
  genders: CategoryFilterOptionWithCount[];
  fits: CategoryFilterOptionWithCount[];
  price_range: RpcPriceRange;
}

export interface RpcMostRelatedVariant {
  variant_id: string;
  main_img_url: string | null;
  product_id: string;
  product_name: string;
  size: string | null;
  price: number | null;
}

export interface CategoryFiltersRpcPayload {
  available_filters: RpcAvailableFilters;
  navigation: RpcNavigation;
  most_related_variant: RpcMostRelatedVariant | null;
  invalid_filter_combination?: boolean;
  debug?: {
    selected_tags_input?: string[];
    selected_tags_valid?: string[];
    invalid_selected_tags?: string[];
    base_variants_count?: number;
    filtered_variants_no_price_count?: number;
    variants_count?: number;
    variants_with_tags?: number;
    variants_without_tags?: number;
    tags_in_variants?: RpcTagFilter[];
    variant_tag_signals?: Array<{
      variant_id: string;
      tag_count: number;
      has_tags: boolean;
      debug_tags?: string;
    }>;
  };
}

export interface CategoryFiltersRpcParams {
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

export async function getCategoryFiltersPayload(
  params: CategoryFiltersRpcParams,
): Promise<CategoryFiltersRpcPayload> {
  const supabase = createClient();

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
