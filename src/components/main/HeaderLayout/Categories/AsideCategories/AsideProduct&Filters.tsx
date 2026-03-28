"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OverviewProduct } from "@/components/main/filters/OverviewProduct";
import { AllFiltersPanel } from "@/components/main/filters/AllFiltersPanel";
import {
  getCategoryFiltersPayload,
  type CategoryFiltersRpcPayload,
} from "@/utils/filters/rpcCategoryFilters";
import { parseSearchParams } from "@/utils/filters/urlFilters";

  interface AsideCategoriesFilterProps {
    categorySelected: string | null;
  }


export const AsideCategoriesFilter = ({
  categorySelected,
}: AsideCategoriesFilterProps) => {
  const asideRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payload, setPayload] = useState<CategoryFiltersRpcPayload | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  const parsedFilters = useMemo(
    () => parseSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  // Initialize aside state on mount
  useEffect(() => {
    if (asideRef.current) {
      gsap.set(asideRef.current, {
        opacity: 0,
        x: 50,
        zIndex: -10,
        pointerEvents: "none",
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDynamicFilters = async () => {
      setIsLoadingFilters(true);

      try {
        const data = await getCategoryFiltersPayload({
          category: parsedFilters.category,
          subcategory: parsedFilters.subcategory,
          tags: parsedFilters.tags,
          colors: parsedFilters.colors,
          brands: parsedFilters.brands,
          sizes: parsedFilters.sizes,
          gender: parsedFilters.gender,
          fit: parsedFilters.fit,
          minPrice: parsedFilters.minPrice,
          maxPrice: parsedFilters.maxPrice,
        });

        if (isMounted) {
          setPayload(data);
        }
      } catch (error) {
        console.error("Error loading dynamic filters payload:", error);
        if (isMounted) {
          setPayload(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFilters(false);
        }
      }
    };

    loadDynamicFilters();

    return () => {
      isMounted = false;
    };
  }, [parsedFilters]);

  const replaceWithParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const toggleMultiParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = value.trim();
      if (!normalized) return;

      const currentValues = params.getAll(key);
      const hasValue = currentValues.includes(normalized);
      const nextValues = hasValue
        ? currentValues.filter((item) => item !== normalized)
        : [...currentValues, normalized];

      params.delete(key);
      nextValues.forEach((item) => params.append(key, item));
      replaceWithParams(params);
    },
    [replaceWithParams, searchParams],
  );

  const toggleSingleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = value.trim();
      if (!normalized) return;

      const current = params.get(key);
      if (current === normalized) {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }

      replaceWithParams(params);
    },
    [replaceWithParams, searchParams],
  );

  const handlePriceChange = useCallback(
    (value: [number, number]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("minPrice", String(value[0]));
      params.set("maxPrice", String(value[1]));
      replaceWithParams(params);
    },
    [replaceWithParams, searchParams],
  );

  return (
    <aside
      ref={asideRef}
      className="aside-filters fixed h-[80%] w-screen max-w-screen bottom-0 flex items-start justify-evenly"
      data-category-selected={categorySelected || ""}
    >
      <AllFiltersPanel
        isLoading={isLoadingFilters}
        availableFilters={payload?.available_filters}
        selectedSizes={parsedFilters.sizes || []}
        selectedColors={parsedFilters.colors || []}
        selectedBrands={parsedFilters.brands || []}
        selectedTags={parsedFilters.tags || []}
        selectedGender={parsedFilters.gender}
        priceValue={[
          parsedFilters.minPrice ?? payload?.available_filters.price_range.min ?? 0,
          parsedFilters.maxPrice ?? payload?.available_filters.price_range.max ?? 150,
        ]}
        onToggleSize={(size) => toggleMultiParam("size", size)}
        onToggleColor={(color) => toggleMultiParam("color", color)}
        onToggleBrand={(brand) => toggleMultiParam("brand", brand)}
        onToggleTag={(tag) => toggleMultiParam("tag", tag)}
        onSelectGender={(gender) => toggleSingleParam("gender", gender)}
        onChangePrice={handlePriceChange}
      />
      <OverviewProduct
        isLoading={isLoadingFilters}
        variant={payload?.most_related_variant || undefined}
      />
    </aside>
  );
};
