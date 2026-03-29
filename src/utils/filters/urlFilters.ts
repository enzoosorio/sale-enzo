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

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeText = (value: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
};

const normalizeSlug = (value: string | null): string | undefined => {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  return SLUG_PATTERN.test(normalized) ? normalized : undefined;
};

const normalizeArray = (values: string[]): string[] | undefined => {
  const normalizedValues = Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return normalizedValues.length > 0 ? normalizedValues : undefined;
};

const parsePrice = (raw: string | null): number | undefined => {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

/**
 * Parse URLSearchParams into a normalized UrlFilters object
 * 
 * @param params - URLSearchParams from Next.js or browser
 * @returns Normalized filter object with undefined for missing values
 */
export function parseSearchParams(params: URLSearchParams): UrlFilters {
  const category = normalizeSlug(params.get("category"));
  const subcategory = normalizeSlug(params.get("subcategory"));
  const colors = normalizeArray(params.getAll("color"));
  const sizes = normalizeArray(params.getAll("size"));
  const brands = normalizeArray(params.getAll("brand"));
  const tags = normalizeArray(params.getAll("tag"));
  const gender = normalizeText(params.get("gender"));
  const fit = normalizeText(params.get("fit"));
  const minPrice = parsePrice(params.get("minPrice"));
  const maxPrice = parsePrice(params.get("maxPrice"));

  return {
    ...(category && { category }),
    ...(subcategory && { subcategory }),
    ...(colors && { colors }),
    ...(sizes && { sizes }),
    ...(brands && { brands }),
    ...(tags && { tags }),
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
