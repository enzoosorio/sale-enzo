"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import gsap from "gsap";
import { useAISearchStore } from "@/store/searchStore";
import { SearchResultsBody } from "./SearchResultsBody";
import { useDebouncedSearch } from "./useDebouncedSearch";

export interface SearchSurfaceHandle {
  /** Must run inside the user's tap so mobile browsers raise the keyboard. */
  open: (trigger: HTMLElement) => void;
}

/**
 * Full-screen search for < xl. A circle the size of the trigger scales from the
 * trigger's center until it covers the viewport (transform only, so it stays on
 * the compositor), then the field and results fade in on top of it.
 * Client-only: render it behind a media query that is false on the server.
 */
export function SearchSurfaceMobile({ ref }: { ref: Ref<SearchSurfaceHandle> }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const { query, change, submit, cancel } = useDebouncedSearch();
  const status = useAISearchStore((state) => state.status);
  const totalCount = useAISearchStore((state) => state.totalCount);

  useEffect(() => () => { tlRef.current?.kill(); }, []);

  const open = (trigger: HTMLElement) => {
    const root = rootRef.current;
    const burst = burstRef.current;
    if (!root || !burst || !contentRef.current) return;
    triggerRef.current = trigger;

    const rect = trigger.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const reach = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Show and focus synchronously, before any animation frame: a hidden input can't take focus.
    root.inert = false;
    root.style.visibility = "visible";
    gsap.set(contentRef.current, { visibility: "visible", opacity: 0 });
    inputRef.current?.focus({ preventScroll: true });
    setIsOpen(true);

    gsap.set(burst, { width: size, height: size, left: cx - size / 2, top: cy - size / 2 });
    tlRef.current?.kill();
    tlRef.current = gsap.timeline()
      .fromTo(burst,
        { scale: reduced ? (reach * 2) / size + 0.1 : 1, autoAlpha: reduced ? 0 : 1 },
        { scale: (reach * 2) / size + 0.1, autoAlpha: 1, duration: reduced ? 0.15 : 0.55, ease: "power3.inOut" })
      .fromTo(contentRef.current,
        { opacity: 0, y: reduced ? 0 : 12 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" },
        reduced ? 0 : "-=0.12");
  };

  const dismiss = () => {
    const root = rootRef.current;
    const tl = tlRef.current;
    if (!root || !tl) return;
    tl.eventCallback("onReverseComplete", () => {
      root.inert = true;
      root.style.visibility = "hidden";
      setIsOpen(false);
      cancel();
      triggerRef.current?.focus({ preventScroll: true });
    });
    tl.timeScale(1.4).reverse();
  };

  useImperativeHandle(ref, () => ({ open }));

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[100] overflow-hidden" style={{ visibility: "hidden" }} inert
      role="dialog" aria-modal="true" aria-label="Buscar productos"
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}>
      <div ref={burstRef} className="absolute rounded-full bg-[#F8F6F1] will-change-transform" aria-hidden="true" />
      <div ref={contentRef} className="invisible relative h-full overflow-y-auto overscroll-contain px-4 pb-10 pt-4 sm:px-8">
        <form role="search" className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-[#F8F6F1] px-4 pb-4 sm:-mx-8 sm:px-8"
          onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="flex h-12 min-w-0 flex-1 items-center border border-[#221C1C]/30 bg-white">
            <label htmlFor="catalog-search-mobile" className="sr-only">Buscar productos</label>
            <input ref={inputRef} id="catalog-search-mobile" type="search" autoComplete="off" enterKeyHint="search"
              value={query} onChange={(event) => change(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent px-4 font-nanum text-[#221C1C] outline-offset-2"
              placeholder="¿Qué estás buscando?" />
            <button type="submit" aria-label="Buscar"
              className="flex h-full aspect-square shrink-0 items-center justify-center border-l border-[#221C1C]/15 focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
              <Search size={20} aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={dismiss} aria-label="Cerrar búsqueda"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#221C1C]/25 active:bg-[#221C1C] active:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
            <X size={20} aria-hidden="true" />
          </button>
        </form>

        <div className="mx-auto max-w-7xl">
          <p className="mb-5 font-inria text-sm text-[#6B635C]" role="status" aria-live="polite">
            {status === "loading" ? "Buscando prendas…" : status === "done" ? `${totalCount} resultados para “${query.trim()}”` : ""}
          </p>
          {status === "idle" ? (
            <div className="py-16 text-center">
              <p className="font-prata text-xl text-[#221C1C]">Empieza a buscar</p>
              <p className="mt-2 font-inria text-sm text-[#6B635C]">Prueba una marca, un deporte o un tipo de prenda.</p>
            </div>
          ) : (
            <SearchResultsBody />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
