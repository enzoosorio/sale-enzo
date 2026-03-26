    import { redirect } from "next/navigation";
    import { findParentCategoryBySubcategorySlug, validateCategoryHierarchyServer } from "@/utils/filters";
import { parseSearchParams } from "@/utils/filters/urlFilters";
import { ProductsLayout } from "@/components/main/products-layout/ProductsLayout";
import { products } from "@/lib/products";

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

  // ============================================================
  // Filters are valid - Fetch and display products
  // ============================================================

  // TODO: Implement product fetching based on filters
  // const products = await getFilteredProducts(filters);

  return (
    <>
    <ProductsLayout 
    products={products}
    title="POLOS"
    />
    </>
  );
}
