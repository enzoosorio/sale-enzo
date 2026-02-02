"use client";

import { DashboardSidebar } from "@/components/admin/DashboardSidebar";

export default function TagsPage() {
  return (
    <>
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
              Tags
            </h1>
            <p className="text-gray-600">
              Manage product tags
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              Tag management will be implemented in the next iteration
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
