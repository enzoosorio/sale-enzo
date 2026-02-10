import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getVariantById } from "@/actions/admin/variant";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/products/ProductEditForm";

/**
 * Variant Edit Page - Server Component
 * 
 * Loads variant data and renders the edit form
 * Reuses the product creation form in UPDATE mode
 */
export default async function VariantEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getVariantById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { variant, parentCategory } = result.data;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link
            href={`/admin/products/${id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Variant Details</span>
          </Link>
          
          <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
            Edit Variant
          </h1>
          <p className="text-gray-600">
            Update variant information for {variant.products.name}
          </p>
        </div>

        {/* Edit Form */}
        <ProductEditForm 
          variantId={id}
          variantData={variant} 
          parentCategory={parentCategory}
        />
      </div>
    </main>
  );
}
