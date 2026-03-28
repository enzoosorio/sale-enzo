/**
 * URL Filter Parser
 * 
 * Utilities for parsing and managing filter state from URL search parameters.
 * This makes the URL the single source of truth for filter state.
 */

export interface UrlFilters {
  category?: string;
  subcategory?: string;
  colors?: string[];
  sizes?: string[];
  brands?: string[];
  tags?: string[];
  gender?: string;
  fit?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Parse URLSearchParams into a normalized UrlFilters object
 * 
 * @param params - URLSearchParams from Next.js or browser
 * @returns Normalized filter object with undefined for missing values
 */
export function parseSearchParams(params: URLSearchParams): UrlFilters {
  const category = params.get("category");
  const subcategory = params.get("subcategory");
  const colors = params.getAll("color");
  const sizes = params.getAll("size");
  const brands = params.getAll("brand");
  const tags = params.getAll("tag");
  const gender = params.get("gender");
  const fit = params.get("fit");
  const minPriceRaw = params.get("minPrice");
  const maxPriceRaw = params.get("maxPrice");
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  return {
    ...(category && { category }),
    ...(subcategory && { subcategory }),
    ...(colors.length > 0 && { colors }),
    ...(sizes.length > 0 && { sizes }),
    ...(brands.length > 0 && { brands }),
    ...(tags.length > 0 && { tags }),
    ...(gender && { gender }),
    ...(fit && { fit }),
    ...(Number.isFinite(minPrice) && { minPrice }),
    ...(Number.isFinite(maxPrice) && { maxPrice }),
  };
}

/**
 * Build a URLSearchParams object from filter values
 * Useful for constructing navigation hrefs
 * 
 * @param filters - Partial filter values
 * @returns URLSearchParams object
 */
export function buildSearchParams(filters: Partial<UrlFilters>): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.subcategory) {
    params.set("subcategory", filters.subcategory);
  }
  if (filters.colors && filters.colors.length > 0) {
    filters.colors.forEach(color => params.append("color", color));
  }
  if (filters.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach(size => params.append("size", size));
  }
  if (filters.brands && filters.brands.length > 0) {
    filters.brands.forEach(brand => params.append("brand", brand));
  }
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => params.append("tag", tag));
  }
  if (filters.gender) {
    params.set("gender", filters.gender);
  }
  if (filters.fit) {
    params.set("fit", filters.fit);
  }
  if (typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice)) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice)) {
    params.set("maxPrice", String(filters.maxPrice));
  }

  return params;
}
