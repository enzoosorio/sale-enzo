"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OverviewProduct } from "@/components/main/filters/OverviewProduct";
import { AllFiltersPanel } from "@/components/main/filters/AllFiltersPanel";
import {
  getCategoryFiltersPayload,
  type CategoryFiltersRpcPayload,
} from "@/utils/filters/rpcCategoryFilters";
import { parseSearchParams } from "@/utils/filters/urlFilters";

interface AsideCategoriesFilterProps {
  categorySelected: string | null;
  /** Writes the filters to the URL without a server round-trip (panel history). */
  onReplaceParams: (params: URLSearchParams) => void;
}


export const AsideCategoriesFilter = ({
  categorySelected,
  onReplaceParams,
}: AsideCategoriesFilterProps) => {
  const searchParams = useSearchParams();

  const [payload, setPayload] = useState<CategoryFiltersRpcPayload | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  const parsedFilters = useMemo(
    () => parseSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const replaceWithParams = onReplaceParams;

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


  const normalizedRange = useMemo<[number, number]>(() => {
    const min = payload?.available_filters.price_range.min ?? 0;
    const max = payload?.available_filters.price_range.max ?? 150;
    const safeMin = Number.isFinite(min) ? Number(min) : 0;
    const safeMax = Number.isFinite(max) ? Number(max) : 150;
    const rangeMin = Math.floor(Math.min(safeMin, safeMax));
    const rangeMax = Math.ceil(Math.max(safeMin, safeMax));
    const normalizedMax = rangeMin === rangeMax ? rangeMax + 1 : rangeMax;
    return [rangeMin, normalizedMax];
  }, [payload?.available_filters.price_range.max, payload?.available_filters.price_range.min]);

  const toggleMultiParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = value.trim().toLowerCase();
      if (!normalized) return;

      const currentValues = Array.from(
        new Set(
          params
            .getAll(key)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
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
      const normalized = value.trim().toLowerCase();
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
      const [rangeMin, rangeMax] = normalizedRange;
      const [nextMinRaw, nextMaxRaw] = [value[0], value[1]].sort(
        (a, b) => a - b,
      ) as [number, number];
      const nextMin = Math.min(Math.max(nextMinRaw, rangeMin), rangeMax);
      const nextMax = Math.min(Math.max(nextMaxRaw, rangeMin), rangeMax);

      const params = new URLSearchParams(searchParams.toString());

      if (nextMin !== rangeMin) {
        params.set("minPrice", String(nextMin));
      } else {
        params.delete("minPrice");
      }

      if (nextMax !== rangeMax) {
        params.set("maxPrice", String(nextMax));
      } else {
        params.delete("maxPrice");
      }

      if (params.toString() !== searchParams.toString()) {
        replaceWithParams(params);
      }
    },
    [normalizedRange, replaceWithParams, searchParams],
  );

  const resetInvalidFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tag");
    params.delete("color");
    params.delete("size");
    params.delete("brand");
    params.delete("gender");
    params.delete("fit");
    params.delete("minPrice");
    params.delete("maxPrice");
    replaceWithParams(params);
  }, [replaceWithParams, searchParams]);

  const isInvalidCombination = payload?.invalid_filter_combination === true;

  return (
    <aside
      className="aside-filters fixed inset-x-0 bottom-0 h-[80%] flex items-end md:items-start justify-evenly"
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
          parsedFilters.minPrice ?? normalizedRange[0],
          parsedFilters.maxPrice ?? normalizedRange[1],
        ]}
        onToggleSize={(size) => toggleMultiParam("size", size)}
        onToggleColor={(color) => toggleMultiParam("color", color)}
        onToggleBrand={(brand) => toggleMultiParam("brand", brand)}
        onToggleTag={(tag) => toggleMultiParam("tag", tag)}
        onSelectGender={(gender) => toggleSingleParam("gender", gender)}
        onChangePrice={handlePriceChange}
      />
      <div className="hidden md:contents">
        <OverviewProduct
          isLoading={isLoadingFilters}
          variant={payload?.most_related_variant || undefined}
          isEmpty={isInvalidCombination}
          onReset={resetInvalidFilters}
        />
      </div>
    </aside>
  );
};
