"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { adminNavigationItems, isAdminNavActive } from "./adminNav";

interface DashboardSidebarProps {
  onLogout?: () => void;
}

export function DashboardSidebar({ onLogout }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        bg-white border-r border-gray-200 
        hidden md:flex flex-col transition-all duration-300 ease-in-out
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
        {adminNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminNavActive(pathname, item);

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
