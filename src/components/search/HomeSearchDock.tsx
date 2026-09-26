"use client";

import { useRef, type RefObject } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SearchSurfaceMobile, type SearchSurfaceHandle } from "./SearchSurfaceMobile";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Scroll distance (px) over which the bar travels from the hero into the header. */
const DOCK_DISTANCE = 160;

const remToPx = (value: string) =>
  parseFloat(value) * parseFloat(getComputedStyle(document.documentElement).fontSize);

/** Docked search button: 44px, the minimum comfortable touch target. */
const COMPACT_SIZE = 44;

/** Minimum breathing room between the docked bar and the header's side groups. */
const DOCK_GUTTER = 32;

/**
 * Room around the header center, bounded by the visible side groups (`data-dock-bound`).
 * `halfWidth` is the widest half-extent that stays centered; `gapOffset` moves an
 * element into the middle of the free gap when the true center is blocked (phones,
 * where the menu logo and session button share the row).
 */
const headerRoom = (nav: HTMLElement) => {
  const visible = (side: string) =>
    [...nav.querySelectorAll<HTMLElement>(`[data-dock-bound='${side}']`)].find((el) => el.offsetParent);
  const start = visible("start");
  const end = visible("end");
  const navRect = nav.getBoundingClientRect();
  const center = navRect.left + navRect.width / 2;
  if (!start || !end) return { halfWidth: Infinity, gapOffset: 0 };
  const left = start.getBoundingClientRect().right + DOCK_GUTTER;
  const right = end.getBoundingClientRect().left - DOCK_GUTTER;
  return { halfWidth: Math.min(center - left, right - center), gapOffset: (left + right) / 2 - center };
};

/**
 * The home search bar lives inside the sticky header. CSS parks it below the header
 * (`--dock-offset`) so it reads as part of the hero; scrolling scrubs it up into the
 * slot the logo leaves behind. One element, never reparented, so focus and text survive.
 *  - xl and up: the full bar compacts and stays usable in the header.
 *  - below xl: it collapses into a round search button that opens a full-screen surface.
 */
export function HomeSearchDock({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const dockRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<SearchSurfaceHandle>(null);
  const isCompact = useMediaQuery("(max-width: 1279.98px)");

  useGSAP(() => {
    const dock = dockRef.current;
    const nav = dock?.parentElement;
    if (!dock || !nav) return;
    const mm = gsap.matchMedia();

    mm.add(
      // The handler only runs while at least one condition matches, so both widths are listed.
      {
        desktop: "(min-width: 1280px)",
        compact: "(max-width: 1279.98px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { desktop, reduce } = context.conditions as { desktop: boolean; reduce: boolean };
        const offset = remToPx(getComputedStyle(dock).getPropertyValue("--dock-offset"));

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: reduce
            ? { start: DOCK_DISTANCE / 2, toggleActions: "play none none reverse" }
            : { start: 0, end: `+=${DOCK_DISTANCE}`, scrub: 0.4, invalidateOnRefresh: true },
        });

        if (logoRef.current) {
          tl.to(logoRef.current, { yPercent: -120, scale: 0.85, autoAlpha: 0, duration: 0.5 }, 0);
        }
        tl.to(dock, { y: -offset, duration: 1 }, 0);

        if (desktop) {
          tl.to(".dock-desktop", {
            width: () => Math.min(460, headerRoom(nav).halfWidth * 2),
            height: 40,
            duration: 1,
          }, 0);
        } else {
          tl.to(".dock-compact-label", { autoAlpha: 0, duration: 0.35 }, 0)
            .to(".dock-compact", { width: COMPACT_SIZE, height: COMPACT_SIZE, borderRadius: 9999, duration: 1 }, 0)
            .to(dock, {
              x: () => {
                const room = headerRoom(nav);
                return room.halfWidth >= COMPACT_SIZE / 2 ? 0 : room.gapOffset;
              },
              duration: 1,
            }, 0);
        }

        if (reduce) tl.duration(0.15);
      },
    );
  }, { scope: dockRef });

  return (
    <div
      ref={dockRef}
      className="pointer-events-none absolute inset-x-0 top-(--dock-offset) z-10 flex h-full items-center justify-center *:pointer-events-auto"
    >
      <div className="dock-desktop hidden h-12 w-[min(600px,calc(100vw-2rem))] xl:block">
        <SuperBarraBusqueda variant="docked" />
      </div>

      <button
        type="button"
        aria-label="Buscar productos"
        aria-haspopup="dialog"
        onClick={(event) => surfaceRef.current?.open(event.currentTarget)}
        className="dock-compact flex h-12 w-[min(600px,calc(100vw-2rem))] items-center overflow-hidden border border-[#221C1C]/30 bg-white text-[#221C1C] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 xl:hidden"
      >
        <span className="dock-compact-label min-w-0 flex-1 truncate px-4 text-left font-nanum text-[#6B635C]">
          ¿Qué estás buscando?
        </span>
        <span className="flex h-full aspect-square shrink-0 items-center justify-center" aria-hidden="true">
          <Search size={20} />
        </span>
      </button>

      {isCompact ? <SearchSurfaceMobile ref={surfaceRef} /> : null}
    </div>
  );
}
