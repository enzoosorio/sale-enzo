"use client";

import { ImagesPageContent } from "@/components/admin/products/ImagesPageContent";

export default function ImagesPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
            Variant Images
          </h1>
          <p className="text-gray-600">
            Manage additional images for product variants
          </p>
        </div>

        {/* Content */}
        <ImagesPageContent />
      </div>
    </main>
  );
}
