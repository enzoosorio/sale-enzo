"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Microphone } from "../svgs/Mic";
import { useAISearchStore } from "@/store/searchStore";
import { SearchResultsOverlay } from "@/components/search/SearchResultsOverlay";

gsap.registerPlugin(useGSAP);

export const SuperBarraBusqueda = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState(false);
  const query = useAISearchStore((state) => state.query);
  const phase = useAISearchStore((state) => state.phase);
  const status = useAISearchStore((state) => state.status);
  const setQuery = useAISearchStore((state) => state.setQuery);
  const setPeek = useAISearchStore((state) => state.setPeek);
  const search = useAISearchStore((state) => state.search);
  const close = useAISearchStore((state) => state.close);
  const isLoading = status === "loading";

  const updatePeek = (value: string, hasFocus: boolean) => {
    setPeek(hasFocus && value.trim().length >= 2);
  };

  // Indeterminate progress line + pulsing icon while the search runs.
  useGSAP(() => {
    if (!isLoading || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.timeline({ repeat: -1 })
      .fromTo("[data-search-progress]", { scaleX: 0, xPercent: 0, autoAlpha: 1 },
        { scaleX: 0.6, xPercent: 40, duration: 0.6, ease: "power2.in" })
      .to("[data-search-progress]", { scaleX: 0, xPercent: 100, duration: 0.5, ease: "power2.out" });
    gsap.to("[data-search-icon]", { scale: 0.82, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, { dependencies: [isLoading], scope: formRef, revertOnUpdate: true });

  const elevated = phase !== "idle";

  return (
    <>
      <form
        ref={formRef}
        role="search"
        aria-label="Buscar productos"
        data-focused={focused || undefined}
        className={`super-barra-busqueda group relative mx-auto flex min-h-12 w-full max-w-[600px] items-center border bg-white shadow-lg transition-[box-shadow,border-color,transform] duration-300 ease-out hover:-translate-y-px hover:shadow-xl data-focused:border-[#221C1C]/70 data-focused:shadow-2xl ${elevated ? "z-[101] border-[#221C1C]/70" : "border-[#221C1C]/30"}`}
        onSubmit={(event) => {
          event.preventDefault();
          void search(query);
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
        <input
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
          className="h-12 min-w-0 flex-1 px-4 font-nanum text-[#221C1C] outline-offset-2"
          placeholder="¿Qué estás buscando?"
          aria-controls="search-results-panel"
        />
        <Microphone barraBusquedaRef={formRef} />
        <button type="submit"
          className="flex h-12 w-12 shrink-0 items-center justify-center border-l border-[#221C1C]/15 transition-colors hover:bg-[#F4F1EB] focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
          aria-label="Buscar">
          <span data-search-icon className="inline-flex"><Search size={20} aria-hidden="true" /></span>
        </button>
        <span data-search-progress aria-hidden="true"
          className="pointer-events-none invisible absolute inset-x-0 -bottom-px h-0.5 origin-left bg-[#221C1C]" />
      </form>
      <SearchResultsOverlay anchorRef={formRef} />
    </>
  );
};
