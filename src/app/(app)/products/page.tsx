    import { redirect } from "next/navigation";
    import { findParentCategoryBySubcategorySlug, validateCategoryHierarchyServer } from "@/utils/filters";
import { parseSearchParams } from "@/utils/filters/urlFilters";

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
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Products</h1>
      
      {/* Debug: Show current filters */}
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Current Filters:</h2>
        <pre className="text-sm">{JSON.stringify(filters, null, 2)}</pre>
      </div>

      {/* Active Filters Display */}
      {(filters.category || filters.subcategory) && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            {filters.subcategory || filters.category}
          </h2>
          
          {filters.category && filters.subcategory && (
            <div className="text-gray-600">
              {filters.category} → {filters.subcategory}
            </div>
          )}
        </div>
      )}

      {/* Additional Filters */}
      {(filters.colors || filters.sizes || filters.gender || filters.fit) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.colors?.map(color => (
            <span key={color} className="px-3 py-1 bg-blue-100 rounded-full text-sm">
              Color: {color}
            </span>
          ))}
          {filters.sizes?.map(size => (
            <span key={size} className="px-3 py-1 bg-green-100 rounded-full text-sm">
              Size: {size}
            </span>
          ))}
          {filters.gender && (
            <span className="px-3 py-1 bg-purple-100 rounded-full text-sm">
              Gender: {filters.gender}
            </span>
          )}
          {filters.fit && (
            <span className="px-3 py-1 bg-orange-100 rounded-full text-sm">
              Fit: {filters.fit}
            </span>
          )}
        </div>
      )}

      {/* Products Grid - TODO: Replace with actual product components */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="p-6 border rounded text-center text-gray-500">
          Products will be displayed here
        </div>
      </div>
    </div>
  );
}
