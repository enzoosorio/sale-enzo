"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ProductCard } from "@/components/main/products-layout/ProductCard";
import { useAISearchStore } from "@/store/searchStore";

gsap.registerPlugin(useGSAP);

export function SearchResultsOverlay() {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = useAISearchStore((state) => state.isOpen);
  const status = useAISearchStore((state) => state.status);
  const results = useAISearchStore((state) => state.results);
  const query = useAISearchStore((state) => state.query);
  const totalCount = useAISearchStore((state) => state.totalCount);
  const close = useAISearchStore((state) => state.close);
  const search = useAISearchStore((state) => state.search);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, close]);

  useGSAP(() => {
    if (!isOpen || !panelRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(panelRef.current,
      { yPercent: reduced ? 0 : 100, autoAlpha: reduced ? 1 : 0 },
      { yPercent: 0, autoAlpha: 1, duration: reduced ? 0 : 0.42, ease: "power3.out" },
    );
  }, { dependencies: [isOpen], scope: panelRef, revertOnUpdate: true });

  if (!mounted || !isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-black/45"
        aria-label="Cerrar resultados de búsqueda" onClick={close} />
      <section id="search-results-panel" ref={panelRef} role="dialog" aria-modal="true"
        aria-labelledby="search-results-title"
        className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-[#F8F6F1] px-4 pb-8 pt-5 shadow-[0_-20px_80px_rgba(0,0,0,.18)] sm:px-8 sm:pt-7">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#221C1C]/25 sm:hidden" aria-hidden="true" />
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#221C1C]/15 pb-5">
            <div>
              <p className="font-inria text-xs uppercase tracking-[0.22em] text-[#6B635C]">Explora el catálogo</p>
              <h2 id="search-results-title" className="mt-1 font-prata text-2xl text-[#221C1C] sm:text-3xl">
                Resultados para “{query.trim()}”
              </h2>
              <p className="mt-2 font-inria text-sm text-[#6B635C]" role="status" aria-live="polite">
                {status === "loading" ? "Buscando prendas…" : status === "done" ? `${totalCount} resultados` : ""}
              </p>
            </div>
            <button ref={closeRef} type="button" onClick={close}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#221C1C]/25 hover:bg-[#221C1C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Cerrar búsqueda">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {status === "loading" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cargando productos">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="animate-pulse" aria-hidden="true">
                  <div className="aspect-4/5 bg-[#EAE5DD]" />
                  <div className="mt-3 h-4 w-4/5 bg-[#EAE5DD]" />
                  <div className="mt-2 h-3 w-2/5 bg-[#EAE5DD]" />
                </div>
              ))}
            </div>
          ) : null}
          {status === "done" && results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => <ProductCard key={product.variant.id} product={product} />)}
            </div>
          ) : null}
          {status === "done" && results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-prata text-xl">No encontramos prendas para esa búsqueda.</p>
              <p className="mt-2 font-inria text-sm text-[#6B635C]">Prueba con otra marca, deporte o tipo de prenda.</p>
            </div>
          ) : null}
          {status === "error" ? (
            <div className="py-16 text-center" role="alert">
              <p className="font-prata text-xl">No pudimos buscar en este momento.</p>
              <button type="button" onClick={() => { void search(query); }}
                className="mt-4 border-b border-[#221C1C] font-inria text-sm">Intentar de nuevo</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
