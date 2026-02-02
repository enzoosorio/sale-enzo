"use client";

import { DashboardSidebar } from "@/components/admin/DashboardSidebar";
import { ProductForm } from "@/components/admin/products/ProductForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewProductPage() {
  return (
    <>
      {/* Main Content */}
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
            
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
              Create New Product
            </h1>
            <p className="text-gray-600">
              Add a new product to your catalog
            </p>
          </div>

          {/* Product Form */}
          <ProductForm />
        </div>
      </main>
    </>
  );
}
