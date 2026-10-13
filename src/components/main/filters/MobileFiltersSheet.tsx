"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { X } from "lucide-react";

gsap.registerPlugin(useGSAP);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MobileFiltersSheetProps {
  id: string;
  open: boolean;
  /** Called on Escape, backdrop tap, the close button and the results button. The caller restores focus. */
  onClose: () => void;
  resultCount: number;
  children: ReactNode;
}

/**
 * Bottom sheet for the catalog filters below lg. Modal: focus moves in and stays in,
 * the page behind does not scroll, and it slides (transform only) unless reduced motion is on.
 * Stays mounted while the exit tween runs, then unmounts.
 */
export function MobileFiltersSheet({ id, open, onClose, resultCount, children }: MobileFiltersSheetProps) {
  const [mounted, setMounted] = useState(open);
  // Mount synchronously on open so the enter tween and focus run in the same commit.
  if (open && !mounted) setMounted(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useGSAP(
    () => {
      if (!mounted || !sheetRef.current || !backdropRef.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (open) {
        closeRef.current?.focus({ preventScroll: true });
        if (reduced) {
          gsap.set(backdropRef.current, { opacity: 1 });
          gsap.set(sheetRef.current, { yPercent: 0 });
          return;
        }
        gsap.timeline()
          .fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out" }, 0)
          .fromTo(sheetRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.42, ease: "power3.out" }, 0);
        return;
      }

      if (reduced) {
        setMounted(false);
        return;
      }
      gsap.timeline({ onComplete: () => setMounted(false) })
        .to(sheetRef.current, { yPercent: 100, duration: 0.3, ease: "power2.in" }, 0)
        .to(backdropRef.current, { opacity: 0, duration: 0.25, ease: "power1.in" }, 0.05);
    },
    { dependencies: [open, mounted], scope: rootRef },
  );

  // Body scroll lock and a document-level Escape while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Keep Tab inside the sheet.
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !sheetRef.current) return;
    const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[70] flex items-end justify-center lg:hidden">
      <div
        ref={backdropRef}
        aria-hidden="true"
        data-testid="filters-sheet-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#221C1C] text-white shadow-2xl will-change-transform"
      >
        <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/30" />
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-gutter pb-3 pt-2">
          <h2 id={titleId} className="font-prata text-3xl">Filtros</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="flex size-11 items-center justify-center rounded-full border border-white/25 active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
        <div className="shrink-0 border-t border-white/10 px-gutter pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full bg-[#FAF9F6] font-prata text-lg text-[#221C1C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver {resultCount} {resultCount === 1 ? "prenda" : "prendas"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
