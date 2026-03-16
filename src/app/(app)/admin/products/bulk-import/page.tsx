"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { BulkUploadSection } from "@/components/admin/products/BulkUploadSection";
import { BulkPreviewTable } from "@/components/admin/products/BulkPreviewTable";
import { BulkImportActions } from "@/components/admin/products/BulkImportActions";
import { createSyntheticProducts } from "@/actions/admin/product/createSyntheticProducts";
import {
  BulkProductInput,
  ProductPreview,
  BulkImportState,
} from "@/types/products/bulk_import";

export default function BulkImportPage() {
  const router = useRouter();
  const [state, setState] = useState<BulkImportState>("idle");
  const [products, setProducts] = useState<BulkProductInput[]>([]);
  const [previews, setPreviews] = useState<ProductPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    failed: number;
    errors?: Array<{ productName: string; error: string }>;
  } | null>(null);

  const handleUpload = (uploadedProducts: BulkProductInput[]) => {
    setState("parsing");
    setError(null);

    try {
      // Transform to preview format
      const productPreviews: ProductPreview[] = uploadedProducts.map((p) => {
        const variant = p.variants[0];
        const item = variant.items[0];

        return {
          name: p.name,
          brand: p.brand,
          category: p.category.name,
          subcategory: p.subcategory.name,
          size: variant.size,
          color: variant.main_color_hex,
          price: item.price,
          stock: item.stock,
          image_url: variant.main_img_url,
        };
      });

      setProducts(uploadedProducts);
      setPreviews(productPreviews);
      setState("preview");
    } catch (err) {
      setError("Failed to parse products");
      setState("error");
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setState("error");
  };

  const handleImport = async () => {
    setState("importing");
    setError(null);

    try {
      const importResult = await createSyntheticProducts(products);
      setResult(importResult);

      if (importResult.success) {
        setState("completed");
      } else {
        setState("error");
        setError("Import failed. Check the errors below.");
      }
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  const handleReset = () => {
    setState("idle");
    setProducts([]);
    setPreviews([]);
    setError(null);
    setResult(null);
  };

  const handleBackToProducts = () => {
    router.push("/admin/products");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>

          <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
            Bulk Product Import
          </h1>
          <p className="text-gray-600">
            Upload a JSON file to import multiple products at once
          </p>
        </div>

        {/* Error Alert */}
        {error && state === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-900 font-semibold mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {state === "completed" && result && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-green-900 font-semibold mb-1">
                  Import Completed
                </h3>
                <p className="text-green-700 text-sm">
                  Successfully imported {result.inserted} products
                  {result.failed > 0 && ` (${result.failed} failed)`}
                </p>
              </div>
            </div>

            {/* Error Details */}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <h4 className="text-green-900 font-medium text-sm mb-2">
                  Failed Products:
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="text-sm text-green-800 bg-green-100 rounded px-3 py-2"
                    >
                      <span className="font-medium">{err.productName}:</span>{" "}
                      {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Products Button */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleBackToProducts}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                View Products
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
              >
                Import More
              </button>
            </div>
          </div>
        )}

        {/* Main Content Based on State */}
        {state === "idle" || state === "error" ? (
          <BulkUploadSection
            onUpload={handleUpload}
            onError={handleError}
            disabled={false}
          />
        ) : state === "parsing" ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Parsing JSON file...</p>
          </div>
        ) : state === "preview" || state === "importing" ? (
          <div className="space-y-6">
            <BulkPreviewTable products={previews} />
            <BulkImportActions
              state={state}
              onImport={handleImport}
              onReset={handleReset}
              disabled={state === "importing"}
            />
          </div>
        ) : null}

        {/* Info Card */}
        {state === "idle" && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-blue-900 font-semibold mb-2">JSON Format</h3>
            <p className="text-blue-800 text-sm mb-3">
              Your JSON file must be an array of products with the following
              structure:
            </p>
            <pre className="bg-blue-100 text-blue-900 p-4 rounded text-xs overflow-x-auto">
              {`[
  {
    "name": "Vintage Graphic Tee",
    "description": "Soft cotton vintage t-shirt",
    "brand": "Nike",
    "category": {
      "name": "t-shirts",
      "slug": "t-shirts"
    },
    "subcategory": {
      "name": "graphic tees",
      "slug": "graphic-tees"
    },
    "is_active": true,
    "variants": [
      {
        "size": "L",
        "gender": "unisex",
        "fit": "oversized",
        "main_color_hex": "#000000",
        "metadata": {
          "material": "cotton",
          "era": "90s"
        },
        "tags": [
          { "name": "vintage", "slug": "vintage" }
        ],
        "secondary_colors": ["#ffffff"],
        "items": [
          {
            "condition": "used",
            "price": 45,
            "sku": "SKU-123",
            "stock": 2,
            "status": "available"
          }
        ]
      }
    ]
  }
]`}
            </pre>
            <div className="mt-4 text-sm text-blue-800">
              <strong>Requirements:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Each product must have exactly 1 variant</li>
                <li>Each variant must have exactly 1 item</li>
                <li>Required fields: name, category, subcategory, variants</li>
                <li>All fields must be populated (no empty values)</li>
                <li>If ANY field is missing or invalid, the entire product is rejected</li>
                <li>Successful products are retained even if others fail</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
