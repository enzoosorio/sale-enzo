"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ProductCard } from "@/components/main/products-layout/ProductCard";
import { useAISearchStore, type SearchPhase } from "@/store/searchStore";

gsap.registerPlugin(useGSAP);

/** How far the panel is pushed down (yPercent) in each phase. */
const PANEL_Y: Record<SearchPhase, number> = { idle: 100, peek: 55, open: 0 };

interface SearchResultsOverlayProps {
  /** The search form; the panel is sized so it never covers it. */
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function SearchResultsOverlay({ anchorRef }: SearchResultsOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const enteredRef = useRef(false);
  const phase = useAISearchStore((state) => state.phase);
  const status = useAISearchStore((state) => state.status);
  const results = useAISearchStore((state) => state.results);
  const query = useAISearchStore((state) => state.query);
  const submittedQuery = useAISearchStore((state) => state.submittedQuery);
  const totalCount = useAISearchStore((state) => state.totalCount);
  const close = useAISearchStore((state) => state.close);
  const search = useAISearchStore((state) => state.search);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (phase !== "idle") setVisible(true); }, [phase]);

  // Keep the panel below the search form.
  useEffect(() => {
    if (!visible) return;
    const measure = () => {
      const bottom = anchorRef.current?.getBoundingClientRect().bottom ?? 0;
      const anchor = Math.min(Math.max(bottom, 0), window.innerHeight * 0.4);
      rootRef.current?.style.setProperty("--search-anchor", `${Math.round(anchor)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [visible, phase, anchorRef]);

  useEffect(() => {
    if (phase !== "open") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Leave focus in the input so the user can refine and press Enter again.
    if (document.activeElement !== document.getElementById("catalog-search")) closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, close]);

  // Phase transitions: idle ⇄ peek ⇄ open.
  useGSAP(() => {
    if (!visible || !panelRef.current || !backdropRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = (seconds: number) => (reduced ? 0 : seconds);
    const panel = panelRef.current;
    if (!enteredRef.current) {
      gsap.set(panel, { yPercent: 100 });
      enteredRef.current = true;
    }

    const config = {
      idle: { duration: d(0.32), ease: "power2.in" },
      peek: { duration: d(0.45), ease: "power3.out" },
      open: { duration: d(0.55), ease: "expo.out" },
    }[phase];

    gsap.to(panel, {
      yPercent: PANEL_Y[phase],
      autoAlpha: phase === "idle" ? 0 : 1,
      ...config,
      overwrite: "auto",
      onComplete: phase === "idle" ? () => { enteredRef.current = false; setVisible(false); } : undefined,
    });
    gsap.to(backdropRef.current, {
      autoAlpha: phase === "open" ? 1 : 0,
      duration: d(phase === "open" ? 0.4 : 0.25),
      ease: "power1.out",
      overwrite: "auto",
    });
    gsap.to("[data-peek-hint]", {
      autoAlpha: phase === "peek" ? 1 : 0, y: phase === "peek" ? 0 : 8,
      duration: d(0.3), ease: "power2.out", overwrite: "auto",
    });
  }, { dependencies: [phase, visible], scope: rootRef });

  // Results enter with a short stagger once they arrive.
  useGSAP(() => {
    if (status !== "done" || !results.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-search-card]", {
      y: 24, autoAlpha: 0, duration: 0.5, ease: "power3.out",
      stagger: { each: 0.04, from: "start" }, clearProps: "transform,opacity,visibility",
    });
  }, { dependencies: [status, results], scope: rootRef });

  if (!mounted || !visible) return null;
  const isOpen = phase === "open";
  return createPortal(
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[100]" style={{ "--search-anchor": "0px" } as React.CSSProperties}>
      <button ref={backdropRef} type="button" tabIndex={-1}
        className={`invisible absolute inset-0 h-full w-full cursor-default bg-black/45 opacity-0 ${isOpen ? "pointer-events-auto" : ""}`}
        aria-label="Cerrar resultados de búsqueda" onClick={close} />
      <section id="search-results-panel" ref={panelRef} role={isOpen ? "dialog" : "region"} aria-modal={isOpen || undefined}
        aria-labelledby="search-results-title"
        className="invisible absolute inset-x-0 bottom-0 h-[calc(100dvh-var(--search-anchor)-16px)] overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#F8F6F1] px-4 pb-8 pt-5 shadow-[0_-20px_80px_rgba(0,0,0,.18)] will-change-transform sm:px-8 sm:pt-7"
        style={{ pointerEvents: isOpen ? "auto" : "none" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#221C1C]/25 sm:hidden" aria-hidden="true" />

          <p data-peek-hint className="invisible flex items-center justify-center gap-2 pb-6 font-inria text-sm text-[#6B635C] opacity-0" aria-hidden={isOpen}>
            <span>Pulsa</span>
            <kbd className="inline-flex items-center gap-1 rounded border border-[#221C1C]/20 bg-white px-1.5 py-0.5 text-xs text-[#221C1C]">
              Enter <CornerDownLeft size={12} aria-hidden="true" />
            </kbd>
            <span>para buscar “{query.trim()}”</span>
          </p>

          {isOpen ? (
            <>
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#221C1C]/15 pb-5">
                <div>
                  <p className="font-inria text-xs uppercase tracking-[0.22em] text-[#6B635C]">Explora el catálogo</p>
                  <h2 id="search-results-title" className="mt-1 font-prata text-2xl text-[#221C1C] sm:text-3xl">
                    Resultados para “{submittedQuery}”
                  </h2>
                  <p className="mt-2 font-inria text-sm text-[#6B635C]" role="status" aria-live="polite">
                    {status === "loading" ? "Buscando prendas…" : status === "done" ? `${totalCount} resultados` : ""}
                  </p>
                </div>
                <button ref={closeRef} type="button" onClick={close}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#221C1C]/25 transition-colors hover:bg-[#221C1C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  {results.map((product) => (
                    <div key={product.variant.id} data-search-card>
                      <ProductCard product={product} />
                    </div>
                  ))}
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
                  <button type="button" onClick={() => { void search(submittedQuery); }}
                    className="mt-4 border-b border-[#221C1C] font-inria text-sm">Intentar de nuevo</button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
