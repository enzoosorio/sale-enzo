"use client";

import { DashboardSidebar } from "@/components/admin/DashboardSidebar";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ProductsPage() {
  return (
    <>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
                Products
              </h1>
              <p className="text-gray-600">
                Manage your product catalog
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

          {/* Products List Placeholder */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">No products yet</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first product</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
