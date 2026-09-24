"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { goUpLevel, pushLevel, replaceLevel } from "./categoryHistory";

export type CategoryLevel = "PARENTS" | "SUBCATEGORIES" | "FILTERS";

/** Params that only make sense once a subcategory is chosen. */
const FILTER_KEYS = ["tag", "color", "size", "brand", "gender", "fit", "minPrice", "maxPrice"];

export function getCategoryLevel(category: string | null, subcategory: string | null): CategoryLevel {
  if (!category) return "PARENTS";
  if (!subcategory) return "SUBCATEGORIES";
  return "FILTERS";
}

/**
 * The URL is the single source of truth for the panel: the visible level is
 * derived from `category`/`subcategory`, and every navigation writes the URL.
 */
export function useCategoryLevel() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const level = getCategoryLevel(category, subcategory);

  const cloneParams = useCallback(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const selectCategory = useCallback(
    (slug: string) => {
      const params = cloneParams();
      params.set("category", slug);
      params.delete("subcategory");
      FILTER_KEYS.forEach((key) => params.delete(key));
      pushLevel(params);
    },
    [cloneParams],
  );

  const selectSubcategory = useCallback(
    (slug: string) => {
      const params = cloneParams();
      params.set("subcategory", slug);
      pushLevel(params);
    },
    [cloneParams],
  );

  const goBack = useCallback(() => {
    const params = cloneParams();
    if (params.has("subcategory")) {
      params.delete("subcategory");
      FILTER_KEYS.forEach((key) => params.delete(key));
    } else {
      params.delete("category");
    }
    goUpLevel(params);
  }, [cloneParams]);

  const navigate = useCallback((params: URLSearchParams, mode: "push" | "replace") => {
    if (mode === "push") pushLevel(params);
    else replaceLevel(params);
  }, []);

  const productsHref = useMemo(() => {
    const query = searchParams.toString();
    return query ? `/products?${query}` : "/products";
  }, [searchParams]);

  return {
    searchParams,
    category,
    subcategory,
    level,
    selectCategory,
    selectSubcategory,
    goBack,
    navigate,
    productsHref,
  };
}
