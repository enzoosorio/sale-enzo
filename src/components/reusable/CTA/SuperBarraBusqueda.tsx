"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Microphone } from "../svgs/Mic";
import { useAISearchStore } from "@/store/searchStore";
import { SearchResultsOverlay } from "@/components/search/SearchResultsOverlay";

export const SuperBarraBusqueda = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = useAISearchStore((state) => state.query);
  const setQuery = useAISearchStore((state) => state.setQuery);
  const search = useAISearchStore((state) => state.search);
  const close = useAISearchStore((state) => state.close);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const scheduleSearch = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length >= 2) {
      timerRef.current = setTimeout(() => { void search(value); }, 300);
    } else {
      close();
      setQuery(value);
    }
  };

  return (
    <>
      <form
        ref={formRef}
        role="search"
        aria-label="Buscar productos"
        className="super-barra-busqueda relative mx-auto flex min-h-12 w-full max-w-[600px] items-center border border-[#221C1C]/30 bg-white shadow-lg transition-shadow focus-within:shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (timerRef.current) clearTimeout(timerRef.current);
          void search(query);
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
        <input
          id="catalog-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => scheduleSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (timerRef.current) clearTimeout(timerRef.current);
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
          className="flex h-12 w-12 shrink-0 items-center justify-center border-l border-[#221C1C]/15 hover:bg-[#F4F1EB] focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
          aria-label="Buscar">
          <Search size={20} aria-hidden="true" />
        </button>
      </form>
      <SearchResultsOverlay />
    </>
  );
};
