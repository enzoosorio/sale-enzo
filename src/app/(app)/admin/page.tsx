"use client";

import { DashboardSidebar } from "@/components/admin/DashboardSidebar";

export default function AdminDashboardPage() {
  return (
    <>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-off-white">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Dashboard creado para administrar productos, categorías, variantes y etiquetas
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Productos"
              value="0"
              description="Productos activos"
              bgColor="bg-white/90"
              textColor="text-blue-700"
            />
            <StatCard
              title="Categorías"
              value="0"
              description="Categorias registradas"
              bgColor="bg-white/90"
              textColor="text-green-700"
            />
            <StatCard
              title="Variantes"
              value="0"
              description="Variantes de los productos"
              bgColor="bg-white/90"
              textColor="text-purple-700"
            />
            <StatCard
              title="Tags"
              value="0"
              description="Etiquetas de productos"
              bgColor="bg-white/90"
              textColor="text-orange-700"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-prata font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickActionButton
                href="/admin/products/new"
                title="Add Product"
                description="Create a new product"
              />
              <QuickActionButton
                href="/admin/categories"
                title="Manage Categories"
                description="Organize product categories"
              />
              <QuickActionButton
                href="/admin/tags"
                title="Manage Tags"
                description="Create and edit tags"
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({
  title,
  value,
  description,
  bgColor,
  textColor,
}: {
  title: string;
  value: string;
  description: string;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6 border border-gray-200`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${textColor} mb-1`}>{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function QuickActionButton({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
