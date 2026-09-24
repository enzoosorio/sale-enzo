"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Categories } from "@/types/products/old_category/categories";
import { ProductCategory } from "@/schema/categorySchema";
import { IndividualCategory } from "./IndividualCategory";
import { BackButton } from "@/components/reusable/svgs/BackButton";
import { AsideCategoriesFilter } from "./AsideCategories/AsideProduct&Filters";
import { useCategoriesStore } from "@/store/categorySection";
import { getSubcategoriesByParentId } from "@/utils/filters/categories";
import { useInfiniteVerticalScroll } from "@/hooks/useInfiniteVerticalScroll";
import { CategoryLevel, useCategoryLevel } from "./useCategoryLevel";

gsap.registerPlugin(useGSAP);

const LEVELS: CategoryLevel[] = ["PARENTS", "SUBCATEGORIES", "FILTERS"];
const EASE_OUT = "power3.out";
const EASE_IN = "power2.in";

const toCategories = (list: ProductCategory[]): Categories[] =>
  list.map((cat) => ({ id: cat.id, name: cat.name.toUpperCase(), slug: cat.slug }));

export const InfiniteScrollCategories = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const parentsMenuRef = useRef<HTMLUListElement>(null);
  const subMenuRef = useRef<HTMLUListElement>(null);
  const asideWrapRef = useRef<HTMLDivElement>(null);
  const parentsItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const subItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const enterAtRef = useRef(0);
  const previousRef = useRef<{ level: CategoryLevel; key: string } | null>(null);

  const { level, category, searchParams, selectCategory, selectSubcategory, goBack, navigate } =
    useCategoryLevel();

  const parentCategories = useCategoriesStore((s) => s.parentCategories);
  const isLoadingCategories = useCategoriesStore((s) => s.isLoadingCategories);
  const subcategoriesByParent = useCategoriesStore((s) => s.subcategoriesByParent);
  const setSubcategories = useCategoriesStore((s) => s.setSubcategories);

  const categories = useMemo(() => toCategories(parentCategories), [parentCategories]);
  const categorySelected = useMemo(
    () => categories.find((cat) => cat.slug === category) ?? null,
    [categories, category],
  );

  const rawSubcategories = categorySelected ? subcategoriesByParent[categorySelected.id] : undefined;
  const subcategories = useMemo(
    () => (rawSubcategories ? toCategories(rawSubcategories) : []),
    [rawSubcategories],
  );
  const isLoadingSubcategories = !!categorySelected && rawSubcategories === undefined;

  // The aside is only mounted around the FILTERS level, so its data isn't fetched elsewhere.
  const [isAsideMounted, setIsAsideMounted] = useState(level === "FILTERS");
  if (level === "FILTERS" && !isAsideMounted) setIsAsideMounted(true);

  // Fetch (and cache in the store) the subcategories of the selected category.
  const selectedId = categorySelected?.id;
  const needsSubcategories = rawSubcategories === undefined;
  useEffect(() => {
    if (!selectedId || !needsSubcategories) return;
    let cancelled = false;

    getSubcategoriesByParentId(selectedId)
      .then((list) => {
        if (!cancelled) setSubcategories(selectedId, list);
      })
      .catch((error) => {
        console.error("Error fetching subcategories:", error);
        if (!cancelled) setSubcategories(selectedId, []);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, needsSubcategories, setSubcategories]);

  // Unknown category slug in the URL: fall back to the parents list.
  useEffect(() => {
    if (!category || categories.length === 0 || categorySelected) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("subcategory");
    navigate(params, "replace");
  }, [category, categories.length, categorySelected, navigate, searchParams]);

  const parentsScroll = useInfiniteVerticalScroll({
    menuRef: parentsMenuRef,
    itemsRef: parentsItemsRef,
    itemCount: categories.length,
    isActive: level === "PARENTS",
  });

  const subScroll = useInfiniteVerticalScroll({
    menuRef: subMenuRef,
    itemsRef: subItemsRef,
    itemCount: subcategories.length,
    isActive: level === "SUBCATEGORIES",
    resetKey: selectedId ?? null,
  });

  const activeScroll = level === "SUBCATEGORIES" ? subScroll : parentsScroll;

  // One timeline per level change. Views are swapped with autoAlpha; items reveal
  // inside their `li` (overflow-hidden acts as the mask). A new change kills the
  // running timeline and starts from whatever state is on screen.
  const transitionKey =
    level === "PARENTS"
      ? `PARENTS:${categories.length}`
      : level === "SUBCATEGORIES"
        ? `SUBCATEGORIES:${selectedId ?? ""}:${subcategories.length}`
        : "FILTERS";

  useGSAP(
    () => {
      const previous = previousRef.current;
      previousRef.current = { level, key: transitionKey };
      if (previous?.key === transitionKey) return;

      const viewFor = (lvl: CategoryLevel) =>
        lvl === "PARENTS"
          ? parentsMenuRef.current
          : lvl === "SUBCATEGORIES"
            ? subMenuRef.current
            : asideWrapRef.current;
      const itemsFor = (lvl: CategoryLevel) =>
        Array.from(
          viewFor(lvl)?.querySelectorAll(
            lvl === "FILTERS" ? ".card-filters-panel" : ".individual-category",
          ) ?? [],
        );

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const leavingLevel = previous && previous.level !== level ? previous.level : null;
      const next = viewFor(level);
      const itemsFrom = level === "FILTERS" ? { y: "100%" } : { yPercent: 100, autoAlpha: 0 };
      const itemsTo =
        level === "FILTERS"
          ? { y: 0, duration: 0.5, ease: EASE_OUT, stagger: 0.12 }
          : { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: EASE_OUT, stagger: { amount: 0.15 } };

      // Same level, items arrived while the transition is still running (e.g. the
      // subcategories fetch resolved): reveal them inside the running timeline.
      const running = timelineRef.current;
      if (!leavingLevel && previous && running?.isActive()) {
        const items = itemsFor(level);
        if (items.length && !reduceMotion) {
          running.fromTo(items, itemsFrom, itemsTo, Math.max(enterAtRef.current, running.time()));
        }
        return;
      }

      running?.kill();

      LEVELS.forEach((lvl) => {
        const view = viewFor(lvl);
        if (!view || lvl === level || lvl === leavingLevel) return;
        gsap.set(view, { autoAlpha: 0, pointerEvents: "none" });
      });

      const tl = gsap.timeline({
        onComplete: () => {
          timelineRef.current = null;
          if (level !== "FILTERS") setIsAsideMounted(false);
        },
      });
      timelineRef.current = tl;

      // Entering on open (or directly from the URL) waits for the panel reveal.
      let enterAt = previous ? 0 : 0.2;

      if (leavingLevel) {
        const leaving = viewFor(leavingLevel);
        if (leaving) {
          gsap.set(leaving, { pointerEvents: "none" });

          const leavingItems = itemsFor(leavingLevel);
          if (!reduceMotion && leavingItems.length) {
            tl.to(
              leavingItems,
              leavingLevel === "FILTERS"
                ? { y: "100%", duration: 0.3, ease: EASE_IN, stagger: 0.06 }
                : { yPercent: -100, autoAlpha: 0, duration: 0.3, ease: EASE_IN, stagger: { amount: 0.1 } },
              0,
            );
          }
          tl.to(leaving, { autoAlpha: 0, duration: 0.15 }, reduceMotion ? 0 : 0.25);
          enterAt = reduceMotion ? 0.15 : 0.3;

          const blobs = rootRef.current
            ?.closest(".categories-section")
            ?.querySelectorAll(".blurred, .blurred-2");
          if (blobs?.length && !reduceMotion) {
            tl.to(
              blobs,
              { x: (i) => (i === 0 ? 160 : -160), duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 1 },
              0,
            );
          }
        }
      }

      enterAtRef.current = enterAt;
      if (!next) return;

      if (reduceMotion) {
        tl.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, enterAt);
      } else {
        tl.set(next, { autoAlpha: 1 }, enterAt);
        const items = itemsFor(level);
        if (items.length) tl.fromTo(items, itemsFrom, itemsTo, enterAt);
      }
      tl.set(next, { pointerEvents: "auto" }, enterAt);

      // Runs only when the context is reverted (unmount / StrictMode remount):
      // the next run must be treated as a fresh entrance.
      return () => {
        previousRef.current = null;
        timelineRef.current = null;
      };
    },
    { dependencies: [transitionKey], scope: rootRef },
  );

  const handleParentClick = useCallback(
    (cat: Categories) => {
      if (cat.slug) selectCategory(cat.slug);
    },
    [selectCategory],
  );

  const handleSubcategoryClick = useCallback(
    (sub: Categories) => {
      if (sub.slug) selectSubcategory(sub.slug);
    },
    [selectSubcategory],
  );

  const replaceFilters = useCallback(
    (params: URLSearchParams) => navigate(params, "replace"),
    [navigate],
  );

  const statusMessage =
    level === "PARENTS" && categories.length === 0 && isLoadingCategories
      ? "Cargando categorías…"
      : level === "SUBCATEGORIES" && isLoadingSubcategories
        ? "Cargando subcategorías…"
        : level === "SUBCATEGORIES" && categorySelected && subcategories.length === 0
          ? "Esta categoría aún no tiene subcategorías."
          : null;

  return (
    <>
      <button
        type="button"
        onClick={goBack}
        aria-label="Volver al nivel anterior"
        className="categories-back fixed z-70 top-[4.5rem] left-3 md:top-1/2 md:-translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-black"
      >
        <BackButton className="w-10" />
      </button>

      <div
        ref={rootRef}
        className="card-infinite-scroll relative flex flex-col h-full items-center justify-center px-4 lg:px-8 w-full sm:w-6/12"
      >
        <div className="relative w-full pt-20 h-dvh">
          <div className="categories-nudge absolute right-2 md:right-[10%] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1 z-20">
            <button
              type="button"
              onClick={() => activeScroll.nudge(-1)}
              aria-label="Categoría anterior"
              className="w-11 h-11 flex items-center justify-center cursor-pointer"
            >
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden>
                <path d="M1 9L11 1L21 9" stroke="black" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => activeScroll.nudge(1)}
              aria-label="Categoría siguiente"
              className="w-11 h-11 flex items-center justify-center cursor-pointer"
            >
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none" className="rotate-180" aria-hidden>
                <path d="M1 9L11 1L21 9" stroke="black" />
              </svg>
            </button>
          </div>

          {statusMessage && (
            <p
              role="status"
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-prata text-lg text-black/60 z-10"
            >
              {statusMessage}
            </p>
          )}

          <ul
            ref={parentsMenuRef}
            aria-label="Categorías"
            className="categories-list invisible opacity-0 absolute inset-0 select-none"
          >
            {categories.map((cat, index) => (
              <li
                ref={(el) => {
                  parentsItemsRef.current[index] = el;
                }}
                key={cat.id}
                className="absolute top-0 left-0 overflow-hidden h-36 w-full flex items-center justify-center"
              >
                <IndividualCategory category={cat} onCategoryClick={handleParentClick} />
              </li>
            ))}
          </ul>

          <ul
            ref={subMenuRef}
            aria-label={categorySelected ? `Subcategorías de ${categorySelected.name}` : "Subcategorías"}
            aria-busy={isLoadingSubcategories}
            className="categories-list invisible opacity-0 absolute inset-0 select-none"
          >
            {subcategories.map((sub, index) => (
              <li
                ref={(el) => {
                  subItemsRef.current[index] = el;
                }}
                key={sub.id}
                className="absolute top-0 left-0 overflow-hidden h-36 w-full flex items-center justify-center"
              >
                <IndividualCategory category={sub} onCategoryClick={handleSubcategoryClick} />
              </li>
            ))}
          </ul>
        </div>

        <div ref={asideWrapRef} className="invisible opacity-0">
          {isAsideMounted && (
            <AsideCategoriesFilter
              categorySelected={categorySelected?.slug ?? null}
              onReplaceParams={replaceFilters}
            />
          )}
        </div>
      </div>
    </>
  );
};
