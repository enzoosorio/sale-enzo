"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Home } from "lucide-react";
import { adminNavigationItems, isAdminNavActive } from "./adminNav";

/** Horizontal chip bar that replaces the desktop sidebar below md. */
export function AdminMobileNav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the active chip in view when the route changes (the bar scrolls sideways).
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Admin" className="shrink-0 border-b border-gray-200 bg-white md:hidden">
      <ul ref={listRef} className="flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {adminNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavActive(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full px-4 font-inria text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 active:bg-gray-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <Link
            href="/home"
            className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 px-4 font-inria text-sm font-medium whitespace-nowrap text-gray-700 active:bg-gray-100"
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
            Volver al sitio
          </Link>
        </li>
      </ul>
    </nav>
  );
}
