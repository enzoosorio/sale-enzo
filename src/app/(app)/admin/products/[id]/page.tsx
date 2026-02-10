import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { getVariantById } from "@/actions/admin/variant";
import { notFound } from "next/navigation";
import Image from "next/image";
import { DeleteVariantButton } from "@/components/admin/products/DeleteVariantButton";

/**
 * Variant Detail Page - Server Component
 * 
 * Displays full variant information with options to edit or delete
 * 
 * @param params - { id: string } - variant UUID
 */
export default async function VariantDetailPage({
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
  const product = variant.products;
  const subcategory = product.product_categories;

  // Calculate total stock and availability
  const totalStock = variant.product_items?.reduce((sum: number, item: any) => sum + (item.stock || 0), 0) || 0;
  const isAvailable = variant.product_items?.some((item: any) => 
    (item.stock || 0) > 0 && item.status === 'available'
  ) || false;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <p className="text-gray-600">
                Variant ID: {variant.id}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href={`/admin/products/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Edit className="w-5 h-5" />
                <span className="font-medium">Edit</span>
              </Link>
              
              <DeleteVariantButton variantId={id} productName={product.name} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Image and Colors */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Image */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Main Image</h3>
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {variant.main_img_url ? (
                  <Image
                    src={variant.main_img_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
            </div>

            {/* Color Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Colors</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Main Color</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: variant.main_color_hex }}
                    />
                    <span className="text-sm font-mono text-gray-700">
                      {variant.main_color_hex}
                    </span>
                  </div>
                </div>

                {variant.variant_secondary_colors && variant.variant_secondary_colors.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Secondary Colors</p>
                    <div className="flex flex-wrap gap-2">
                      {variant.variant_secondary_colors.map((color: any, idx: number) => (
                        <div
                          key={idx}
                          className="w-10 h-10 rounded-lg border-2 border-gray-300"
                          style={{ backgroundColor: color.secondary_color_hex }}
                          title={color.secondary_color_hex}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Availability Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Availability</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      ${isAvailable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                      }
                    `}
                  >
                    {isAvailable ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Stock</span>
                  <span className="font-semibold text-gray-900">{totalStock}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Product Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Product Name</p>
                  <p className="font-medium text-gray-900">{product.name}</p>
                </div>
                
                {product.brand && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Brand</p>
                    <p className="font-medium text-gray-900">{product.brand}</p>
                  </div>
                )}

                {parentCategory && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Category</p>
                    <p className="font-medium text-gray-900">{parentCategory.name}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Subcategory</p>
                  <p className="font-medium text-gray-900">{subcategory.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="font-medium text-gray-900">
                    {product.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {product.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-gray-700">{product.description}</p>
                </div>
              )}
            </div>

            {/* Variant Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Variant Details</h3>
              
              <div className="grid grid-cols-3 gap-4">
                {variant.size && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Size</p>
                    <p className="font-medium text-gray-900">{variant.size}</p>
                  </div>
                )}

                {variant.gender && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Gender</p>
                    <p className="font-medium text-gray-900 capitalize">{variant.gender}</p>
                  </div>
                )}

                {variant.fit && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fit</p>
                    <p className="font-medium text-gray-900 capitalize">{variant.fit}</p>
                  </div>
                )}
              </div>

              {variant.metadata && Object.keys(variant.metadata).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Metadata</p>
                  <div className="bg-gray-50 rounded p-3">
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(variant.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Items / Inventory */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Inventory Items ({variant.product_items?.length || 0})
              </h3>
              
              {variant.product_items && variant.product_items.length > 0 ? (
                <div className="space-y-3">
                  {variant.product_items.map((item: any, idx: number) => (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Condition</p>
                          <p className="font-medium capitalize">{item.condition || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Price</p>
                          <p className="font-medium">${item.price}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Stock</p>
                          <p className="font-medium">{item.stock || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">SKU</p>
                          <p className="font-medium font-mono text-xs">{item.sku || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Status</p>
                          <span
                            className={`
                              inline-block px-2 py-1 rounded text-xs font-medium
                              ${item.status === 'available' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                              }
                            `}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No inventory items</p>
              )}
            </div>

            {/* Tags */}
            {variant.variant_tags && variant.variant_tags.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {variant.variant_tags.map((vt: any) => (
                    <span
                      key={vt.tag_id}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {vt.tags.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {variant.variant_images && variant.variant_images.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Additional Images ({variant.variant_images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {variant.variant_images.map((img: any) => (
                    <div key={img.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={img.image_url}
                        alt={`Variant image ${img.position || ''}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      {img.position && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                          {img.position}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
