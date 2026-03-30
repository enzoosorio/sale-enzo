"use client";

import { useSearchParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BreadcrumbItemCustom } from "./BreadcrumbItem";
import { buildSearchParams } from "@/utils/filters/urlFilters";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MainLogoAnimated } from "@/components/reusable/svgs/MainLogo-w-Animations";
import { usePathname, useRouter } from "next/navigation";

export interface BreadcrumbItemCustomProps {
  href: string;
  label?: string;
  //svg
  svgIcon?: React.ReactNode;
}

type FilterKind = "multi" | "single" | "price";

interface ActiveFilterEntry {
  id: string;
  label: string;
  kind: FilterKind;
  key?: string;
  value?: string;
}

/**
 * URL-driven breadcrumb navigation
 * Reflects current filter state from URL search parameters
 */
export function Breadcrumbs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLLIElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const basePath = pathname.startsWith("/products") ? pathname : "/products";

  // Read filter values from URL
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const colors = searchParams.getAll("color");
  const sizes = searchParams.getAll("size");
  const brands = searchParams.getAll("brand");
  const tags = searchParams.getAll("tag");
  const gender = searchParams.get("gender");
  const fit = searchParams.get("fit");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const activeFilters = useMemo<ActiveFilterEntry[]>(() => {
    const entries: ActiveFilterEntry[] = [];

    colors.forEach((value) => {
      entries.push({
        id: `color:${value}`,
        label: `color: ${value}`,
        kind: "multi",
        key: "color",
        value,
      });
    });

    sizes.forEach((value) => {
      entries.push({
        id: `size:${value}`,
        label: `size: ${value}`,
        kind: "multi",
        key: "size",
        value,
      });
    });

    brands.forEach((value) => {
      entries.push({
        id: `brand:${value}`,
        label: `brand: ${value}`,
        kind: "multi",
        key: "brand",
        value,
      });
    });

    tags.forEach((value) => {
      entries.push({
        id: `tag:${value}`,
        label: `tag: ${value}`,
        kind: "multi",
        key: "tag",
        value,
      });
    });

    if (gender) {
      entries.push({
        id: `gender:${gender}`,
        label: `gender: ${gender}`,
        kind: "single",
        key: "gender",
      });
    }

    if (fit) {
      entries.push({
        id: `fit:${fit}`,
        label: `fit: ${fit}`,
        kind: "single",
        key: "fit",
      });
    }

    if (minPrice || maxPrice) {
      entries.push({
        id: "price-range",
        label: `price: S/${minPrice ?? "0"} - S/${maxPrice ?? "max"}`,
        kind: "price",
      });
    }

    return entries;
  }, [brands, colors, fit, gender, maxPrice, minPrice, sizes, tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(event.target as Node)) return;
      setIsDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const removeFilter = useCallback(
    (filter: ActiveFilterEntry) => {
      const params = new URLSearchParams(searchParams.toString());

      if (filter.kind === "multi" && filter.key && filter.value) {
        const nextValues = params
          .getAll(filter.key)
          .filter((item) => item !== filter.value);
        params.delete(filter.key);
        nextValues.forEach((item) => params.append(filter.key!, item));
      } else if (filter.kind === "single" && filter.key) {
        params.delete(filter.key);
      } else if (filter.kind === "price") {
        params.delete("minPrice");
        params.delete("maxPrice");
      }

      setIsDropdownOpen(false);
      const query = params.toString();
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    },
    [basePath, router, searchParams],
  );

  // Build breadcrumb items dynamically
  const breadcrumbItems: BreadcrumbItemCustomProps[] = [];

  // Home (always present)
  breadcrumbItems.push({ href: "/home", svgIcon: <MainLogoAnimated className="w-8" /> });

  // Category level
  if (category) {
    const categoryParams = buildSearchParams({ category });
    breadcrumbItems.push({
      href: `${basePath}?${categoryParams.toString()}`,
      label: category,
    });
  }

  // Subcategory level (preserves category)
  if (subcategory && category) {
    const subcategoryParams = buildSearchParams({ category, subcategory });
    breadcrumbItems.push({
      href: `${basePath}?${subcategoryParams.toString()}`,
      label: subcategory,
    });
  }

  return (
    <Breadcrumb className="absolute top-14 left-16 z-20">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.href}>
            <BreadcrumbItemCustom
              key={item.href}
              href={item.href}
              label={item.label!}
              svgIcon={item.svgIcon}
            />
            {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator key={`sep-${index}`} />}
          </React.Fragment>
        ))}

        {activeFilters.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem ref={dropdownRef} className="relative text-lg font-prata">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="px-2 py-1 hover:bg-orange-200/20 rounded-sm transition-colors cursor-pointer flex items-center justify-center min-h-8"
                aria-expanded={isDropdownOpen}
                aria-label="Show active filters"
              >
                <svg  className="w-7"  viewBox="0 0 114 114" fill="none">
                  <g id="wrapper-filters-count">
                    <path id="Vector 37" d="M9.00004 29.9996C9.00004 29.9996 7.50004 102.439 9.00004 104C9.99999 105.04 86.0001 104 86.0001 104M30 83.9996C31.49 85.4996 102.513 86 104.5 83.9996C106.487 81.9992 106 11.5094 104.5 9.99958C102.016 7.49958 32.0001 7.98504 30 9.99958C28.0002 12.014 28.5101 82.4996 30 83.9996Z" stroke="black" strokeWidth="4" strokeLinecap="round" />
                  </g>
                </svg>

                <div className="absolute top-[40%] left-[52.5%] -translate-y-1/2 -translate-x-1/2">
                  {
                    activeFilters.length > 0 && activeFilters.length < 10 ? (
                      <span className="ml-1 text-sm font-medium font-mono">{activeFilters.length}</span>
                    ) : (
                      <span className="ml-1 text-sm font-medium font-mono">9+</span>
                    )
                  }
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 min-w-64 max-h-80 overflow-auto border border-black/15 bg-off-white shadow-lg p-2 z-30">
                  <ul className="flex flex-col gap-1">
                    {activeFilters.map((filter) => (
                      <li key={filter.id}>
                        <button
                          type="button"
                          onClick={() => removeFilter(filter)}
                          className="w-full text-left px-2 py-1 text-sm hover:bg-black/5 rounded-sm transition-colors cursor-pointer"
                          title="Quitar filtro"
                        >
                          {filter.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
