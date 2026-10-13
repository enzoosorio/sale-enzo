"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
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

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);

/** The Flip sidebar needs room beside the grid; below this the filters open in a bottom sheet. */
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

  const [isAnimating, setIsAnimating] = useState(false);
  const [layoutActive, setLayoutActive] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const isSidebarViewport = useMediaQuery(SIDEBAR_QUERY);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const payload = initialFiltersPayload;
  const isLoadingFilters = false;

  const gridRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const fastNavRef = useRef<HTMLDivElement>(null);
  const breadcrumbsRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Last layout state that was animated; also keeps Strict Mode's double effect run from animating on mount.
  const renderedLayoutActive = useRef(layoutActive);

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

  useGSAP(
    () => {
      if (renderedLayoutActive.current === layoutActive) return;
      renderedLayoutActive.current = layoutActive;

      // Below lg the filters live in the bottom sheet; the Flip sidebar only has to be reset.
      if (!window.matchMedia(SIDEBAR_QUERY).matches) {
        containerRef.current?.classList.remove("layout-active");
        setIsAnimating(false);
        return;
      }

      const container = containerRef.current;
      const grid = gridRef.current;
      const sidebar = sidebarRef.current;
      const fastNav = fastNavRef.current;
      const breadcrumbs = breadcrumbsRef.current;
      const overlay = overlayRef.current;
      if (!container || !grid || !sidebar || !fastNav || !breadcrumbs || !overlay) return;

      const mm = gsap.matchMedia();
      mm.add(
        // Two complementary queries so the toggle runs either way; only the duration differs.
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          motionOk: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const flipDuration = context.conditions?.reduceMotion ? 0 : 0.45;

          // Only called from callbacks of tweens created here; GSAP runs those inside this
          // matchMedia context, so the Flip and follow-up tweens are reverted with it. Wrapping
          // them with the hook's contextSafe would nest the two contexts inside each other.
          const flipLayout = (open: boolean, onComplete: () => void) => {
            const state = Flip.getState([container, grid, sidebar]);
            // Flip lifts the targets out of flow; holding the section's height keeps the page
            // from collapsing, so the browser never clamps the scroll position mid-animation.
            const section = container.parentElement;
            if (section) gsap.set(section, { minHeight: section.offsetHeight });
            container.classList.toggle("layout-active", open);
            Flip.from(state, {
              duration: flipDuration,
              ease: "power3.inOut",
              absolute: true,
              nested: true,
              stagger: 0.01,
              onComplete: () => {
                if (section) gsap.set(section, { clearProps: "minHeight" });
                // Flip can leave an identity transform and frozen sizes behind. A transformed ancestor
                // becomes the containing block of the pinned (position: fixed) fast-nav and would
                // scroll it away with the page, and frozen sizes break responsive layout.
                gsap.set([container, grid, sidebar], {
                  clearProps: "transform,translate,rotate,scale,width,height",
                });
                // The grid and sidebar changed size, so the fast-nav triggers must re-measure.
                // Refresh outside this context so nothing it touches is recorded here.
                context.ignore(() => ScrollTrigger.refresh());
                onComplete();
              },
            });
          };

          setIsAnimating(true);

          if (layoutActive) {
            gsap
              .timeline()
              .to([breadcrumbs, fastNav], { autoAlpha: 0, duration: 0.25 }, 0)
              .call(() =>
                flipLayout(true, () => {
                  gsap
                    .timeline()
                    .to(sidebar, { opacity: 1, duration: 0.1 }, 0)
                    .to(overlay, { x: "-100%", duration: 0.5 }, 0.05);
                  setIsAnimating(false);
                }),
              );
            return;
          }

          // revertOnUpdate just restored the bar; keep it hidden until the grid settles.
          gsap.set(fastNav, { autoAlpha: 0 });
          gsap
            .timeline()
            .to(overlay, { x: "0%", duration: 0.5 }, 0)
            .to(sidebar, { opacity: 0, duration: 0.1 }, ">0.05")
            .call(() =>
              flipLayout(false, () => {
                gsap.to([fastNav, breadcrumbs], { autoAlpha: 1, duration: 0.1 });
                setIsAnimating(false);
              }),
            );
        },
      );
    },
    { scope: containerRef, dependencies: [layoutActive], revertOnUpdate: true },
  );

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
    // Below lg the Flip sidebar never runs: it has no room and left the panel at width 0.
    if (!window.matchMedia(SIDEBAR_QUERY).matches) {
      setFiltersSheetOpen((open) => !open);
      return;
    }
    if (isAnimating) return;
    setLayoutActive(!layoutActive);
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
          <div ref={breadcrumbsRef} className="absolute -top-4 left-0 w-full z-30">
            <Breadcrumbs id="bread-in-layout" className="absolute top-14 left-gutter z-20" />
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
            className="relative filters-wrapper text-white transition-colors"
          >
            {/* The fast-nav title is the page heading; this one only labels the filters panel. */}
            <h2 className="pt-10 pb-6 px-4 bg-black/30 font-prata text-6xl">
              {mainFastNavItem.name}
            </h2>
            <AsideFilters {...filterProps} />
            <div ref={overlayRef} className="overlay-filters fixed inset-0 w-full h-screen bg-off-white" />
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
         ${isAnimating ? "pointer-events-none cursor-not-allowed opacity-50" : "pointer-events-auto cursor-pointer opacity-100"}
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
