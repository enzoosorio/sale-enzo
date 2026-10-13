"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Microphone } from "../svgs/Mic";
import { useAISearchStore } from "@/store/searchStore";
import { SearchResultsOverlay } from "@/components/search/SearchResultsOverlay";
import { useMediaQuery } from "@/hooks/useMediaQuery";

gsap.registerPlugin(useGSAP);

interface SuperBarraBusquedaProps {
  /** `docked` lives in the header: GSAP owns its size and the overlay only mounts on xl. */
  variant?: "hero" | "docked";
}

export const SuperBarraBusqueda = ({ variant = "hero" }: SuperBarraBusquedaProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const query = useAISearchStore((state) => state.query);
  const phase = useAISearchStore((state) => state.phase);
  const status = useAISearchStore((state) => state.status);
  const setQuery = useAISearchStore((state) => state.setQuery);
  const setPeek = useAISearchStore((state) => state.setPeek);
  const search = useAISearchStore((state) => state.search);
  const close = useAISearchStore((state) => state.close);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const docked = variant === "docked";
  const isLoading = status === "loading";

  const updatePeek = (value: string, hasFocus: boolean) => {
    setPeek(hasFocus && value.trim().length >= 2);
  };

  // "/" focuses the docked bar from anywhere on the page, like most catalog search fields.
  useEffect(() => {
    if (!docked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [docked]);

  // Indeterminate progress line + pulsing icon while the search runs.
  useGSAP(() => {
    if (!isLoading || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.timeline({ repeat: -1 })
      .fromTo("[data-search-progress]", { scaleX: 0, xPercent: 0, autoAlpha: 1 },
        { scaleX: 0.6, xPercent: 40, duration: 0.6, ease: "power2.in" })
      .to("[data-search-progress]", { scaleX: 0, xPercent: 100, duration: 0.5, ease: "power2.out" });
    gsap.to("[data-search-icon]", { scale: 0.82, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, { dependencies: [isLoading], scope: formRef, revertOnUpdate: true });

  // While the results panel is up the bar stays above its backdrop. The docked bar sits
  // inside the header's stacking context, so the header lifts itself via `data-search-elevated`.
  const elevated = phase !== "idle";

  return (
    <>
      <form
        ref={formRef}
        role="search"
        aria-label="Buscar productos"
        data-focused={focused || undefined}
        data-search-elevated={elevated || undefined}
        className={`super-barra-busqueda group relative mx-auto flex w-full items-center border bg-white transition-[box-shadow,border-color,transform] duration-300 ease-out hover:-translate-y-px data-focused:border-[#221C1C]/70 ${
          docked
            ? "h-full shadow-md hover:shadow-lg data-focused:shadow-xl"
            : "min-h-12 max-w-[600px] shadow-lg hover:shadow-xl data-focused:shadow-2xl"
        } ${elevated ? `${docked ? "" : "z-[101]"} border-[#221C1C]/70` : "border-[#221C1C]/30"}`}
        onSubmit={(event) => {
          event.preventDefault();
          void search(query);
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
        <input
          ref={inputRef}
          id="catalog-search"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            updatePeek(event.target.value, true);
          }}
          onFocus={(event) => { setFocused(true); updatePeek(event.target.value, true); }}
          onBlur={(event) => { setFocused(false); updatePeek(event.target.value, false); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close();
              event.currentTarget.blur();
            }
          }}
          className={`${docked ? "h-full" : "h-12"} min-w-0 flex-1 px-4 font-nanum text-[#221C1C] outline-offset-2`}
          placeholder="¿Qué estás buscando?"
          aria-controls="search-results-panel"
          aria-keyshortcuts={docked ? "/" : undefined}
        />
        <Microphone />
        <button type="submit"
          className={`flex ${docked ? "h-full aspect-square" : "h-12 w-12"} shrink-0 items-center justify-center border-l border-[#221C1C]/15 transition-colors hover:bg-[#F4F1EB] focus-visible:outline-2 focus-visible:outline-offset-[-3px]`}
          aria-label="Buscar">
          <span data-search-icon className="inline-flex"><Search size={20} aria-hidden="true" /></span>
        </button>
        <span data-search-progress aria-hidden="true"
          className="pointer-events-none invisible absolute inset-x-0 -bottom-px h-0.5 origin-left bg-[#221C1C]" />
      </form>
      {!docked || isDesktop ? <SearchResultsOverlay anchorRef={formRef} /> : null}
    </>
  );
};
