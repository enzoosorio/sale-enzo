"use client";

import { useSearchParams } from "next/navigation";
import {
  Breadcrumb,  
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BreadcrumbItemCustom } from "./BreadcrumbItem";
import { buildSearchParams } from "@/utils/filters/urlFilters";
import React from "react";
import { Logo } from "@/components/reusable/svgs/Logo";
import { MainLogo } from "@/components/reusable/svgs/MainLogo";

export interface BreadcrumbItemCustomProps {
  href: string;
  label?: string;
  //svg
  svgIcon?: React.ReactNode;
}

/**
 * URL-driven breadcrumb navigation
 * Reflects current filter state from URL search parameters
 */
export function Breadcrumbs() {
  const searchParams = useSearchParams();
  
  // Read filter values from URL
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const colors = searchParams.getAll("color");
  const sizes = searchParams.getAll("size");
  const gender = searchParams.get("gender");
  const fit = searchParams.get("fit");

  // Build breadcrumb items dynamically
  const breadcrumbItems: BreadcrumbItemCustomProps[] = [];

  // Home (always present)
  breadcrumbItems.push({ href: "/home",svgIcon: <MainLogo className="w-10"/>});

  // Category level
  if (category) {
    const categoryParams = buildSearchParams({ category });
    breadcrumbItems.push({
      href: `?${categoryParams.toString()}`,
      label: category,
    });
  }

  // Subcategory level (preserves category)
  if (subcategory && category) {
    const subcategoryParams = buildSearchParams({ category, subcategory });
    breadcrumbItems.push({
      href: `?${subcategoryParams.toString()}`,
      label: subcategory,
    });
  }

  // Optional: Add filter indicators if colors, sizes, gender, or fit are present
  const activeFilters: string[] = [];
  if (colors.length > 0) activeFilters.push(`${colors.length} color${colors.length > 1 ? 's' : ''}`);
  if (sizes.length > 0) activeFilters.push(`${sizes.length} size${sizes.length > 1 ? 's' : ''}`);
  if (gender) activeFilters.push(gender);
  if (fit) activeFilters.push(fit);

  if (activeFilters.length > 0) {
    const allParams = buildSearchParams({
      category: category || undefined,
      subcategory: subcategory || undefined,
      colors: colors.length > 0 ? colors : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      gender: gender || undefined,
      fit: fit || undefined,
    });
    breadcrumbItems.push({
      href: `?${allParams.toString()}`,
      label: `Filters (${activeFilters.length})`,
    });
  }

  return (
    <Breadcrumb className="absolute bottom-12 left-12 z-30">
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
      </BreadcrumbList>
    </Breadcrumb>
  );
}
