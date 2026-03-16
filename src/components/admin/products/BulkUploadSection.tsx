"use client";

import { Upload, FileJson } from "lucide-react";
import { BulkProductInput } from "@/types/products/bulk_import";

interface BulkUploadSectionProps {
  onUpload: (products: BulkProductInput[]) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function BulkUploadSection({
  onUpload,
  onError,
  disabled = false,
}: BulkUploadSectionProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      onError("Please upload a valid JSON file");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!Array.isArray(data)) {
        onError("JSON must be an array of products");
        return;
      }

      if (data.length === 0) {
        onError("JSON array is empty");
        return;
      }

      // Validate each product
      for (let i = 0; i < data.length; i++) {
        const product = data[i];

        if (!product.name) {
          onError(`Product #${i + 1}: Missing required field 'name'`);
          return;
        }

        if (!product.category || !product.category.name) {
          onError(`Product #${i + 1}: Missing required field 'category'`);
          return;
        }

        if (!product.subcategory || !product.subcategory.name) {
          onError(`Product #${i + 1}: Missing required field 'subcategory'`);
          return;
        }

        if (!product.variants || !Array.isArray(product.variants)) {
          onError(`Product #${i + 1}: Missing required field 'variants'`);
          return;
        }

        if (product.variants.length !== 1) {
          onError(
            `Product #${i + 1}: Must contain exactly 1 variant (found ${product.variants.length})`
          );
          return;
        }

        const variant = product.variants[0];

        if (!variant.items || !Array.isArray(variant.items)) {
          onError(`Product #${i + 1}: Variant must contain 'items' array`);
          return;
        }

        if (variant.items.length !== 1) {
          onError(
            `Product #${i + 1}: Variant must contain exactly 1 item (found ${variant.items.length})`
          );
          return;
        }

        if (!variant.main_img_url) {
          onError(`Product #${i + 1}: Variant must include 'main_img_url' field for testing`);
          return;
        }

        const item = variant.items[0];

        if (typeof item.price !== "number") {
          onError(`Product #${i + 1}: Item price must be a number`);
          return;
        }
      }

      // All validations passed
      onUpload(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        onError("Invalid JSON format: " + error.message);
      } else {
        onError("Failed to parse JSON file");
      }
    }

    // Reset input so same file can be uploaded again
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <FileJson className="w-8 h-8 text-gray-600" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Upload JSON File
          </h3>
          <p className="text-sm text-gray-600">
            Select a JSON file containing product data
          </p>
        </div>

        <label
          htmlFor="json-upload"
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-medium
            transition-colors cursor-pointer
            ${
              disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }
          `}
        >
          <Upload className="w-5 h-5" />
          <span>Choose File</span>
          <input
            id="json-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </label>

        <div className="text-xs text-gray-500 text-center max-w-md">
          <p>The JSON file must contain an array of products.</p>
          <p>Each product must have exactly 1 variant and 1 item.</p>
        </div>
      </div>
    </div>
  );
}
