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
  gender?: string;
  fit?: string;
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
  const gender = params.get("gender");
  const fit = params.get("fit");

  return {
    ...(category && { category }),
    ...(subcategory && { subcategory }),
    ...(colors.length > 0 && { colors }),
    ...(sizes.length > 0 && { sizes }),
    ...(gender && { gender }),
    ...(fit && { fit }),
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
  if (filters.gender) {
    params.set("gender", filters.gender);
  }
  if (filters.fit) {
    params.set("fit", filters.fit);
  }

  return params;
}
