  import { redirect } from "next/navigation";
  import { findParentCategoryBySubcategorySlug, validateCategoryHierarchyServer } from "@/utils/filters";
import { parseSearchParams } from "@/utils/filters/urlFilters";
import { ProductsLayout } from "@/components/main/products-layout/ProductsLayout";
  import { getProductsForGrid } from "@/utils/filters/rpcProductsGrid";
  import { getCategoryFiltersPayloadServer } from "@/utils/filters/rpcCategoryFiltersServer";

/**
 * Products Page - Server Component
 * 
 * This page is the main products listing with URL-based filtering.
 * It validates category hierarchy and redirects if the URL is malformed.
 * 
 * URL Parameters:
 * - category: Parent category slug
 * - subcategory: Subcategory slug
 * - color: Color filters (can be multiple)
 * - size: Size filters (can be multiple)
 * - gender: Gender filter
 * - fit: Fit filter
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;

  // Convert to URLSearchParams
  const urlSearchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => urlSearchParams.append(key, v));
    } else if (value) {
      urlSearchParams.set(key, value);
    }
  });
  
  // Parse filters from URL
  const filters = parseSearchParams(urlSearchParams);

  // ============================================================
  // PHASE 4: Hierarchical Validation
  // ============================================================
  
  // TODO: Refactor this logic into a separate server-side function for cleanliness and testability.
  //  TODO 2: Consider edge cases, such as non-existent subcategories or categories, and how to handle them gracefully.
  //  TODO 3: Consider all extra filters like brand, color, etc. and ensure they are preserved during redirects.
  // Case 1: Subcategory exists but category doesn't
  // → Auto-inject parent category and redirect
  if (filters.subcategory && !filters.category) {
    const parent = await findParentCategoryBySubcategorySlug(filters.subcategory);
    
    if (parent) {
      // Build normalized URL with parent category
      const normalizedParams = new URLSearchParams();
      normalizedParams.set("category", parent.slug);
      normalizedParams.set("subcategory", filters.subcategory);
      
      // Preserve other filters
      if (filters.colors && filters.colors.length > 0) {
        filters.colors.forEach(color => normalizedParams.append("color", color));
      }
      if (filters.sizes && filters.sizes.length > 0) {
        filters.sizes.forEach(size => normalizedParams.append("size", size));
      }
      if (filters.gender) normalizedParams.set("gender", filters.gender);
      if (filters.fit) normalizedParams.set("fit", filters.fit);
      
      // Redirect to normalized URL
      redirect(`/products?${normalizedParams.toString()}`);
    } else {
      // Subcategory doesn't exist in DB → redirect to clean products page
      redirect("/products");
    }
  }

  // Case 2: Both category and subcategory exist
  // → Validate that subcategory belongs to category
  if (filters.category && filters.subcategory) {
    const isValid = await validateCategoryHierarchyServer(filters.category, filters.subcategory);
    
    if (!isValid) {
      // Invalid hierarchy → redirect to just category
      const normalizedParams = new URLSearchParams();
      normalizedParams.set("category", filters.category);
      
      // Preserve non-hierarchical filters
      if (filters.colors && filters.colors.length > 0) {
        filters.colors.forEach(color => normalizedParams.append("color", color));
      }
      if (filters.sizes && filters.sizes.length > 0) {
        filters.sizes.forEach(size => normalizedParams.append("size", size));
      }
      if (filters.gender) normalizedParams.set("gender", filters.gender);
      if (filters.fit) normalizedParams.set("fit", filters.fit);
      
      redirect(`/products?${normalizedParams.toString()}`);
    }
  }

  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(pageValue);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const limit = 24;
  const offset = (page - 1) * limit;

  const [productsPayload, filtersPayload] = await Promise.all([
    getProductsForGrid({
      category: filters.category,
      subcategory: filters.subcategory,
      tags: filters.tags,
      colors: filters.colors,
      brands: filters.brands,
      sizes: filters.sizes,
      gender: filters.gender,
      fit: filters.fit,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      limit,
      offset,
    }),
    getCategoryFiltersPayloadServer({
      category: filters.category,
      subcategory: filters.subcategory,
      tags: filters.tags,
      colors: filters.colors,
      brands: filters.brands,
      sizes: filters.sizes,
      gender: filters.gender,
      fit: filters.fit,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    }),
  ]);

  return (
    <>
      <ProductsLayout products={productsPayload.products} initialFiltersPayload={filtersPayload} />
    </>
  );
}
