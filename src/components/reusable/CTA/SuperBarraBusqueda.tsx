"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Microphone } from "../svgs/Mic";
import { SearchResultsOverlay } from "@/components/search/SearchResultsOverlay";
import { useDebouncedSearch } from "@/components/search/useDebouncedSearch";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SuperBarraBusquedaProps {
  /** `docked` lives in the header: GSAP owns its size and the overlay only mounts on xl. */
  variant?: "hero" | "docked";
}

export const SuperBarraBusqueda = ({ variant = "hero" }: SuperBarraBusquedaProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, change, submit, cancel } = useDebouncedSearch();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const docked = variant === "docked";

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

  return (
    <>
      <form
        ref={formRef}
        role="search"
        aria-label="Buscar productos"
        className={`super-barra-busqueda relative mx-auto flex w-full items-center border border-[#221C1C]/30 bg-white transition-shadow ${
          docked ? "h-full shadow-md focus-within:shadow-lg" : "min-h-12 max-w-[600px] shadow-lg focus-within:shadow-xl"
        }`}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
        <input
          ref={inputRef}
          id="catalog-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              cancel();
              event.currentTarget.blur();
            }
          }}
          className={`${docked ? "h-full" : "h-12"} min-w-0 flex-1 px-4 font-nanum text-[#221C1C] outline-offset-2`}
          placeholder="¿Qué estás buscando?"
          aria-controls="search-results-panel"
          aria-keyshortcuts={docked ? "/" : undefined}
        />
        <Microphone barraBusquedaRef={formRef} />
        <button type="submit"
          className={`flex ${docked ? "h-full aspect-square" : "h-12 w-12"} shrink-0 items-center justify-center border-l border-[#221C1C]/15 hover:bg-[#F4F1EB] focus-visible:outline-2 focus-visible:outline-offset-[-3px]`}
          aria-label="Buscar">
          <Search size={20} aria-hidden="true" />
        </button>
      </form>
      {!docked || isDesktop ? <SearchResultsOverlay /> : null}
    </>
  );
};
