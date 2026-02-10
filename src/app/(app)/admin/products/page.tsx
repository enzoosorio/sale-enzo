import Link from "next/link";
import { Plus } from "lucide-react";
import { getProductVariants } from "@/actions/admin/product";
import { SearchBar } from "@/components/admin/products/SearchBar";
import { Pagination } from "@/components/admin/products/Pagination";
import { VariantGrid } from "@/components/admin/products/VariantGrid";
import { Suspense } from "react";

/**
 * Admin Products Page - Server Component
 * 
 * URL-driven state using searchParams (Next.js App Router pattern)
 * Primary entity: product_variants (not products)
 * 
 * @param searchParams - { search?: string, page?: string }
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || '';
  const currentPage = Number(params.page) || 1;
  const ITEMS_PER_PAGE = 10;

  // Fetch variants with pagination and search
  const result = await getProductVariants(search, currentPage, ITEMS_PER_PAGE);

  const variants = result.data || [];
  const totalItems = result.total || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
              Product Variants
            </h1>
            <p className="text-gray-600">
              Manage your product catalog ({totalItems} variants)
            </p>
          </div>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Product</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-11 bg-gray-100 rounded-lg animate-pulse" />}>
            <SearchBar placeholder="Search by product name..." />
          </Suspense>
        </div>

        {/* Variants Grid */}
        {result.success ? (
          <>
            <VariantGrid variants={variants} />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Suspense fallback={<div className="h-12 mt-8" />}>
                <Pagination totalPages={totalPages} />
              </Suspense>
            )}
          </>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{result.error || 'Failed to load variants'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
