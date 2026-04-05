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
import { finalBackground, initialBackground } from "@/app/(app)/home/page";
import { AllFiltersPanel } from "@/components/main/filters/AllFiltersPanel";
import {
  type CategoryFiltersRpcPayload,
  type RpcNavigationNode,
} from "@/utils/filters/rpcCategoryFilters";
import { buildSearchParams, parseSearchParams } from "@/utils/filters/urlFilters";
import { Breadcrumbs } from "@/components/main/HeaderLayout/Categories/Breadcrumbs/Breadcrumbs";
import { AsideFilters } from "./AsideFilters";

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);

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

  const payload = initialFiltersPayload;
  const isLoadingFilters = false;

  const gridRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const tlFastBar = useRef<gsap.core.Timeline | null>(null);
  const fastNavTriggerRef = useRef<ScrollTrigger | null>(null);
  const isFirstMount = useRef(true);

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
    const { category: _, subcategory: __, ...rest } = parsedFilters;
    const baseParams = buildSearchParams(rest);
    const query = baseParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [parsedFilters, pathname]);

  const headerNavigationItems = useMemo<ProductsFastNavItem[]>(() => {
    const source: RpcNavigationNode[] = hasSubcategorySelected
      ? payload.navigation.subcategories || []
      : payload.navigation.categories || [];

    return source.map((entry) => {
      const { category: _, subcategory: __, ...rest } = parsedFilters;
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
        name: "ALL",
        href: clearHierarchyHref,
      };
    }

    return {
      slug: mainSlug,
      name: formatNavLabel(mainSlug),
      href: clearHierarchyHref,
    };
  }, [clearHierarchyHref, headerNavigationItems, mainSlug]);

  useEffect(() => {
    console.log("Payload de filtros actualizado:", payload);
    console.log("Productos totales recibidos del catalogo:", products.length);
  }, [products, payload]);

  const createFastNavScrollTrigger = useCallback(() => {
    // Verificar que los elementos existan en el DOM
    const fastNavWrapper = document.querySelector('.fast-nav-wrapper');
    const otherSubcategories = document.querySelectorAll('.other-subcategories-fast-nav');
    
    if (!fastNavWrapper) {
      console.warn('ProductsFastNav: fast-nav-wrapper no encontrado');
      return;
    }

    // Guardar el scroll actual
    const currentScroll = window.scrollY;
    
    // Matar cualquier trigger anterior COMPLETAMENTE
    if (fastNavTriggerRef.current) {
      fastNavTriggerRef.current.kill();
      fastNavTriggerRef.current = null;
    }
    if (tlFastBar.current) {
      tlFastBar.current.kill();
      tlFastBar.current = null;
    }

    // Resetear estilos de las subcategorías a su estado inicial
    gsap.set('.other-subcategories-fast-nav', {
      opacity: 0,
      pointerEvents: 'none',
    });

    let animatingFastBar = false;

    // Crear nuevo timeline
    tlFastBar.current = gsap.timeline({ paused: true });
    tlFastBar.current.to('.other-subcategories-fast-nav', {
      opacity: 1,
      pointerEvents: 'auto',
      duration: 0.3,
      stagger: { each: 0.25, from: "start" },
      ease: "circ.out"
    }, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        id: "fastNavTrigger",
        trigger: ".fast-nav-wrapper",
        start: "top top",
        end: () => {
          const productSection = document.querySelector(".products-section");
          const sectionHeight = productSection ? productSection.clientHeight : 0;
          return `+=${sectionHeight}`;
        },
        pin: '.fast-nav-wrapper',
        pinSpacing: false,
        invalidateOnRefresh: true,
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          if (progress > 0.03 && !animatingFastBar && tlFastBar.current) {
            gsap.to(".title-main", {
              fontSize: "3rem",
              duration: 1.2,
              ease: "power2.out",
            });
            animatingFastBar = true;
            tlFastBar.current.progress(0).play();
          } else if (progress <= 0.03 && animatingFastBar && tlFastBar.current) {
            gsap.to(".title-main", {
              fontSize: "6rem",
              duration: 1.2,
              ease: "power2.out",
            });
            animatingFastBar = false;
            tlFastBar.current.progress(1).reverse();
          }
        }
      }
    });
    tl.to('.fast-nav-wrapper', { top: 0, ease: "power2.out", duration: 0.5 }, 0);
    tl.fromTo(".fast-nav-wrapper",
      { background: initialBackground },
      {
        background: finalBackground,
        backdropFilter: "blur(16px)",
        ease: "elastic.out(1,1)",
        duration: 0.025,
      },
      0
    );

    fastNavTriggerRef.current = tl.scrollTrigger!;

    // Sincronizar estado inicial con el progress actual del ScrollTrigger
    if (fastNavTriggerRef.current && fastNavTriggerRef.current.progress > 0.105) {
      gsap.set(".title-main", { fontSize: "3rem", overwrite: true });
      if (tlFastBar.current) {
        tlFastBar.current.progress(1);
      }
      animatingFastBar = true;
    } else {
      if (tlFastBar.current) {
        tlFastBar.current.progress(0);
      }
    }
    
    // Refresh después de crear todo
    ScrollTrigger.refresh();
    
    // Restaurar scroll si es necesario
    window.scrollTo(0, currentScroll);
    
    return tl;
  }, []);

  // useEffect para crear el ScrollTrigger al montar el componente Y cuando cambian los items
  useEffect(() => {
    // Delay para asegurar que React termine de actualizar el DOM
    const timer = setTimeout(() => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.id === "fastNavTrigger") {
          trigger.kill();
        }
      });
      createFastNavScrollTrigger();
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [headerNavigationItems, mainFastNavItem, createFastNavScrollTrigger]);
  
  // Cleanup en unmount
  // useEffect(() => {
  //   return () => {
  //     killFastNavTrigger();
  //   };
  // }, [killFastNavTrigger]);

  const killFastNavTrigger = useCallback(() => {
    if (fastNavTriggerRef.current) {
      fastNavTriggerRef.current.kill();
      fastNavTriggerRef.current = null;
    }
    if (tlFastBar.current) {
      tlFastBar.current.kill();
      tlFastBar.current = null;
    }
    // Solo resetear estilos específicos, no usar clearProps
    gsap.set('.other-subcategories-fast-nav', {
      opacity: 0,
      pointerEvents: 'none',
    });
    gsap.killTweensOf(".title-main");
  }, []);

  const activateLayout = () => {
    if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

    const container = containerRef.current;
    const currentScroll = window.scrollY;

    killFastNavTrigger();

    gsap.set(".fast-nav-wrapper", { visibility: "hidden", opacity: 0 });

    const state = Flip.getState([
      container,
      gridRef.current,
      sidebarRef.current,
    ]);

    container.classList.add("layout-active");

    Flip.from(state, {
      duration: 1,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      stagger: 0.01,
      onComplete: () => {
        ScrollTrigger.refresh();
        window.scrollTo(0, currentScroll);
        const tl = gsap.timeline();
        tl.to(sidebarRef.current, { opacity: 1, duration: 0.1 }, 0);
        tl.to(".subcategory-title", { color: "#fff", duration: 0.35 }, 0.05);
        tl.to(".title-main", { opacity: 0, duration: 0.35 }, 0.06);
        tl.to(".overlay-filters", { x: "-100%", duration: 0.5 }, 0.05);

        setIsAnimating(false);
      },
    });
  };
  const deactivateLayout = () => {
    if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

    const container = containerRef.current;
    const currentScroll = window.scrollY;

    killFastNavTrigger();

    gsap.set(".fast-nav-wrapper", { visibility: "hidden", opacity: 0 });

    const state = Flip.getState([
      container,
      gridRef.current,
      sidebarRef.current,
    ]);

    container.classList.remove("layout-active");

    Flip.from(state, {
      duration: 1,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      stagger: 0.01,
      onComplete: () => {
        gsap.set(".fast-nav-wrapper", { visibility: "visible", opacity: 1 });
        createFastNavScrollTrigger();

        ScrollTrigger.refresh();
        window.scrollTo(0, currentScroll);

        gsap.to(".fast-nav-wrapper", {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.1,
        });
         gsap.to("#bread-in-layout", {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.1,
        });
        setIsAnimating(false);
      },
    });
  };
  useGSAP(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return; // No ejecutar animaciones al montar
    }

    if (layoutActive) {
      setIsAnimating(true);
      const tl = gsap.timeline();
      tl.to(
        "#bread-in-layout",
        {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.25,
        },
        0,
      )
      tl.to(
        ".fast-nav-wrapper",
        {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.25,
        },
        0,
      ).then(() => {
        activateLayout();
      });
    } else {
      setIsAnimating(true);
      const tl = gsap.timeline();
      tl.to(
        ".subcategory-title",
        { color: "#221C1C", duration: 0.1 },
        0,
      ).to(
        ".title-main",
        { opacity: 1, duration: 0.1 },
        0.05,
      );
      tl.to(
        ".overlay-filters",
        { x: "0%", duration: 0.5 },
        0,
      );
      tl.to(
        sidebarRef.current,
        { opacity: 0, duration: 0.1 },
        ">0.05",
      ).then(() => {
        deactivateLayout();

      });
    }
  }, [layoutActive]);

  return (
    <main className="main-products">
      <section className="products-section w-full min-h-screen overflow-clip flex flex-col items-start justify-start gap-0 relative ">
        <div
          ref={containerRef}
          className={`wrapper-pf relative grid grid-cols-1 grid-rows-2 w-screen gap-0`}
        >
          <div className="absolute -top-4 -left-4 w-full z-30">
            <Breadcrumbs id="bread-in-layout" />
          </div>
          <ProductsFastNav
            items={headerNavigationItems}
            mainItem={mainFastNavItem}
          />
          <aside
            ref={sidebarRef}
            className="relative filters-wrapper overflow-y-auto text-white transition-colors"
          >
            <h1 className="subcategory-title pt-10 pb-6 px-4 bg-black/30  font-prata text-6xl bg-">
              {mainFastNavItem.name}
            </h1>
            <AsideFilters
            isLoading={isLoadingFilters}
              availableFilters={payload?.available_filters}
              navigation={payload?.navigation}
              selectedCategory={parsedFilters.category}
              selectedSubcategory={parsedFilters.subcategory}
              selectedSizes={parsedFilters.sizes || []}
              selectedColors={parsedFilters.colors || []}
              selectedBrands={parsedFilters.brands || []}
              selectedTags={parsedFilters.tags || []}
              selectedGender={parsedFilters.gender}
              priceValue={[
                parsedFilters.minPrice ?? normalizedRange[0],
                parsedFilters.maxPrice ?? normalizedRange[1],
              ]}
              onSelectCategory={selectCategory}
              onSelectSubcategory={selectSubcategory}
              onToggleSize={(size) => toggleMultiParam("size", size)}
              onToggleColor={(color) => toggleMultiParam("color", color)}
              onToggleBrand={(brand) => toggleMultiParam("brand", brand)}
              onToggleTag={(tag) => toggleMultiParam("tag", tag)}
              onSelectGender={(gender) => toggleSingleParam("gender", gender)}
              onChangePrice={handlePriceChange}
            />
            <div className="overlay-filters fixed inset-0 w-full h-screen bg-off-white" />
          </aside>
          <ProductGrid ref={gridRef} products={products} />
        </div>
      </section>
      <button
        onClick={() => {
          if (isAnimating) return;
          setLayoutActive(!layoutActive);
        }}
        className={`filter-button fixed bottom-8 right-8 z-50
         bg-black/5 stroke stroke-[rgba(181,179,179,0.6)] 
         backdrop-blur-md shadow rounded-full p-3.5 w-16
         ${isAnimating ? "pointer-events-none cursor-not-allowed opacity-50" : "pointer-events-auto cursor-pointer opacity-100"}
         `}
      >
        <svg viewBox="0 0 32 32" fill="none" className="stroke-black">
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