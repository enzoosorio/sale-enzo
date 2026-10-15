"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WholeProductStructure } from "@/types/products/products";
import { ProductGrid } from "./ProductGrid";
import { ProductsFastNav, type ProductsFastNavItem } from "./ProductsFastNav";
import {
  type CategoryFiltersRpcPayload,
  type RpcNavigationNode,
} from "@/utils/filters/rpcCategoryFilters";
import { buildSearchParams, parseSearchParams } from "@/utils/filters/urlFilters";
import { Breadcrumbs } from "@/components/main/HeaderLayout/Categories/Breadcrumbs/Breadcrumbs";
import { AsideFilters, type AsideFilterProps } from "./AsideFilters";
import { MobileFiltersSheet } from "@/components/main/filters/MobileFiltersSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";

gsap.registerPlugin(ScrollTrigger);

/** The sidebar drawer needs room beside the grid; below this the filters open in a bottom sheet. */
const SIDEBAR_QUERY = "(min-width: 64rem)";
const FILTERS_SHEET_ID = "mobile-filters-sheet";

interface ProductsLayoutProps {
  products: WholeProductStructure[];
  initialFiltersPayload: CategoryFiltersRpcPayload;
}

const formatNavLabel = (input: string) =>
  input
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

export const ProductsLayout = ({ products, initialFiltersPayload }: ProductsLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [layoutActive, setLayoutActive] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const isSidebarViewport = useMediaQuery(SIDEBAR_QUERY);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const payload = initialFiltersPayload;
  const isLoadingFilters = false;

  const gridRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarMounted = useRef(false);
  const fastNavRef = useRef<HTMLDivElement>(null);

  const parsedFilters = useMemo(
    () => parseSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const replaceWithParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    const sanitizedFilters = parseSearchParams(new URLSearchParams(searchParams.toString()));
    const sanitizedKnownParams = buildSearchParams(sanitizedFilters);
    const mergedParams = new URLSearchParams(searchParams.toString());

    [
      "category",
      "subcategory",
      "color",
      "size",
      "brand",
      "tag",
      "gender",
      "fit",
      "minPrice",
      "maxPrice",
    ].forEach((key) => mergedParams.delete(key));

    sanitizedKnownParams.forEach((value, key) => {
      mergedParams.append(key, value);
    });

    if (mergedParams.toString() !== searchParams.toString()) {
      replaceWithParams(mergedParams);
    }
  }, [replaceWithParams, searchParams]);

  const normalizedRange = useMemo<[number, number]>(() => {
    const min = payload?.available_filters.price_range.min ?? 0;
    const max = payload?.available_filters.price_range.max ?? 150;
    const safeMin = Number.isFinite(min) ? Number(min) : 0;
    const safeMax = Number.isFinite(max) ? Number(max) : 150;
    const rangeMin = Math.floor(Math.min(safeMin, safeMax));
    const rangeMax = Math.ceil(Math.max(safeMin, safeMax));
    const normalizedMax = rangeMin === rangeMax ? rangeMax + 1 : rangeMax;
    return [rangeMin, normalizedMax];
  }, [payload]);

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

  const selectCategory = useCallback(
    (categorySlug: string) => {
      const normalized = categorySlug.trim().toLowerCase();
      if (!normalized) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("category", normalized);
      params.delete("subcategory");
      replaceWithParams(params);
    },
    [replaceWithParams, searchParams],
  );

  const selectSubcategory = useCallback(
    (subcategorySlug: string) => {
      const normalized = subcategorySlug.trim().toLowerCase();
      if (!normalized || !parsedFilters.category) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("category", parsedFilters.category);
      params.set("subcategory", normalized);
      replaceWithParams(params);
    },
    [parsedFilters.category, replaceWithParams, searchParams],
  );

  const hasSubcategorySelected =
    typeof parsedFilters.subcategory === "string" && parsedFilters.subcategory.length > 0;
  const mainSlug = parsedFilters.subcategory ?? parsedFilters.category ?? "all";

  const clearHierarchyHref = useMemo(() => {
    const rest = { ...parsedFilters };
    delete rest.category;
    delete rest.subcategory;
    const baseParams = buildSearchParams(rest);
    const query = baseParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [parsedFilters, pathname]);

  const headerNavigationItems = useMemo<ProductsFastNavItem[]>(() => {
    const source: RpcNavigationNode[] = hasSubcategorySelected
      ? payload.navigation.subcategories || []
      : payload.navigation.categories || [];

    return source.map((entry) => {
      const rest = { ...parsedFilters };
      delete rest.category;
      delete rest.subcategory;
      const nextFilters = {
        ...rest,
        ...(hasSubcategorySelected && parsedFilters.category
          ? { category: parsedFilters.category, subcategory: entry.slug }
          : { category: entry.slug }),
      };
      const nextParams = buildSearchParams(nextFilters);
      const query = nextParams.toString();

      return {
        slug: entry.slug,
        name: entry.name,
        href: query ? `${pathname}?${query}` : pathname,
      };
    });
  }, [hasSubcategorySelected, parsedFilters, payload.navigation.categories, payload.navigation.subcategories, pathname]);

  const mainFastNavItem = useMemo<ProductsFastNavItem>(() => {
    const matched = headerNavigationItems.find((item) => item.slug === mainSlug);
    if (matched) return matched;

    if (mainSlug === "all") {
      return {
        slug: "all",
        name: "Todo",
        href: clearHierarchyHref,
      };
    }

    return {
      slug: mainSlug,
      name: formatNavLabel(mainSlug),
      href: clearHierarchyHref,
    };
  }, [clearHierarchyHref, headerNavigationItems, mainSlug]);



  // A new result set changes the grid height, which moves where the fast-nav pin ends.
  // Re-measure after paint instead of rebuilding any animation.
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [products]);

  // The sidebar is a fixed drawer: only transform and visibility change, so the grid never reflows.
  // Plain tweens in an effect (not a reverting GSAP context): the drawer's end state must persist.
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const firstRun = !sidebarMounted.current;
    sidebarMounted.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = firstRun || reduceMotion ? 0 : 0.35;

    if (layoutActive) {
      gsap.set(sidebar, { visibility: "visible" });
      gsap.to(sidebar, { xPercent: 0, duration, ease: "power3.out", overwrite: true });
    } else {
      gsap.to(sidebar, {
        xPercent: -100,
        duration,
        ease: "power3.in",
        overwrite: true,
        onComplete: () => { gsap.set(sidebar, { visibility: "hidden" }); },
      });
    }
    return () => { gsap.killTweensOf(sidebar); };
  }, [layoutActive]);

  useEffect(() => {
    if (!layoutActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayoutActive(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layoutActive]);

  // Crossing lg closes whichever filters surface no longer fits the viewport.
  useEffect(() => {
    const media = window.matchMedia(SIDEBAR_QUERY);
    const onChange = () => {
      if (media.matches) setFiltersSheetOpen(false);
      else setLayoutActive(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const closeFiltersSheet = useCallback(() => {
    setFiltersSheetOpen(false);
    filterButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const toggleFilters = () => {
    // Below lg the sidebar has no room, so the filters open in the bottom sheet instead.
    if (!window.matchMedia(SIDEBAR_QUERY).matches) {
      setFiltersSheetOpen((open) => !open);
      return;
    }
    setLayoutActive((open) => !open);
  };

  const filtersOpen = isSidebarViewport ? layoutActive : filtersSheetOpen;

  const filterProps: AsideFilterProps = {
    isLoading: isLoadingFilters,
    availableFilters: payload?.available_filters,
    navigation: payload?.navigation,
    selectedCategory: parsedFilters.category,
    selectedSubcategory: parsedFilters.subcategory,
    selectedSizes: parsedFilters.sizes || [],
    selectedColors: parsedFilters.colors || [],
    selectedBrands: parsedFilters.brands || [],
    selectedTags: parsedFilters.tags || [],
    selectedGender: parsedFilters.gender,
    priceValue: [
      parsedFilters.minPrice ?? normalizedRange[0],
      parsedFilters.maxPrice ?? normalizedRange[1],
    ],
    onSelectCategory: selectCategory,
    onSelectSubcategory: selectSubcategory,
    onToggleSize: (size) => toggleMultiParam("size", size),
    onToggleColor: (color) => toggleMultiParam("color", color),
    onToggleBrand: (brand) => toggleMultiParam("brand", brand),
    onToggleTag: (tag) => toggleMultiParam("tag", tag),
    onSelectGender: (gender) => toggleSingleParam("gender", gender),
    onChangePrice: handlePriceChange,
  };

  return (
    <main className="main-products">
      <section className="products-section w-full min-h-screen overflow-clip flex flex-col items-start justify-start gap-0 relative ">
        <div
          ref={containerRef}
          className="wrapper-pf relative w-full"
        >
          <div className="absolute -top-4 left-0 w-full z-30">
            <Breadcrumbs id="bread-in-layout" className="absolute top-14 left-gutter z-20" hideWhenRoot />
          </div>
          <ProductsFastNav
            items={headerNavigationItems}
            mainItem={mainFastNavItem}
            categorySlug={parsedFilters.category ?? null}
            subcategorySlug={parsedFilters.subcategory ?? null}
            rootRef={fastNavRef}
          />
          <aside
            ref={sidebarRef}
            inert={!layoutActive}
            aria-label="Filtros"
            className="filters-wrapper text-white"
          >
            {/* The fast-nav title is the page heading; this one only labels the filters panel. */}
            <h2 className="pt-10 pb-6 px-4 bg-black/30 font-prata text-6xl">
              {mainFastNavItem.name}
            </h2>
            <AsideFilters {...filterProps} className="min-h-0 flex-1" />
          </aside>
          <ProductGrid ref={gridRef} products={products} />
        </div>
      </section>
      <MobileFiltersSheet
        id={FILTERS_SHEET_ID}
        open={filtersSheetOpen && !isSidebarViewport}
        onClose={closeFiltersSheet}
        resultCount={products.length}
      >
        <AsideFilters {...filterProps} className="min-h-0 flex-1 h-auto overscroll-contain px-2 pb-8 pt-4" />
      </MobileFiltersSheet>
      <button
        ref={filterButtonRef}
        type="button"
        aria-label={filtersOpen ? "Cerrar filtros" : "Abrir filtros"}
        aria-expanded={filtersOpen}
        aria-haspopup={isSidebarViewport ? undefined : "dialog"}
        aria-controls={!isSidebarViewport && filtersSheetOpen ? FILTERS_SHEET_ID : undefined}
        onClick={toggleFilters}
        className={`filter-button fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-gutter lg:bottom-8 lg:right-8 z-50
         bg-black/5 stroke stroke-[rgba(181,179,179,0.6)]
         backdrop-blur-md shadow rounded-full p-3.5 size-16
         pointer-events-auto cursor-pointer
         `}
      >
        <svg viewBox="0 0 32 32" fill="none" className="stroke-black" aria-hidden="true">
          <g id="filters-svg">
            <path
              id="Vector"
              d="M5.33301 6.66667H13.333M13.333 6.66667C13.333 8.13943 14.5269 9.33333 15.9997 9.33333C17.4725 9.33333 18.6663 8.13943 18.6663 6.66667M13.333 6.66667C13.333 5.19391 14.5269 4 15.9997 4C17.4725 4 18.6663 5.19391 18.6663 6.66667M18.6663 6.66667H26.6663M5.33301 16H21.333M21.333 16C21.333 17.4728 22.5269 18.6667 23.9997 18.6667C25.4725 18.6667 26.6663 17.4728 26.6663 16C26.6663 14.5272 25.4725 13.3333 23.9997 13.3333C22.5269 13.3333 21.333 14.5272 21.333 16ZM10.6663 25.3333H26.6663M10.6663 25.3333C10.6663 23.8605 9.47243 22.6667 7.99967 22.6667C6.52691 22.6667 5.33301 23.8605 5.33301 25.3333C5.33301 26.8061 6.52691 28 7.99967 28C9.47243 28 10.6663 26.8061 10.6663 25.3333Z"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </button>
    </main>
  );
};
