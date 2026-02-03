"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Tag, 
  Palette,
  Image,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

interface DashboardSidebarProps {
  onLogout?: () => void;
}

const navigationItems = [
  { 
    name: "Dashboard", 
    href: "/admin", 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    name: "Productos", 
    href: "/admin/products", 
    icon: Package 
  },
  { 
    name: "Categorías", 
    href: "/admin/categories", 
    icon: Layers 
  },
  { 
    name: "Variantes", 
    href: "/admin/variants", 
    icon: Palette 
  },
  { 
    name: "Tags", 
    href: "/admin/tags", 
    icon: Tag 
  },
  { 
    name: "Imagenes", 
    href: "/admin/images", 
    icon: Image 
  },
];

export function DashboardSidebar({ onLogout }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        bg-white border-r border-gray-200 
        flex flex-col transition-all duration-300 ease-in-out
        relative
      `}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <h1 className="text-xl font-prata font-bold text-gray-900">
            Admin
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors duration-150 font-inria
                ${isActive 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} />
              {!collapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Back to Site */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/home"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-gray-700 hover:bg-gray-100 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? "Back to Site" : undefined}
        >
          <LogOut className={`${collapsed ? 'w-6 h-6' : 'w-5 h-5'} shrink-0`} />
          {!collapsed && (
            <span className="font-medium">Volver al Sitio</span>
          )}
        </Link>
      </div>
    </aside>
  );
}
