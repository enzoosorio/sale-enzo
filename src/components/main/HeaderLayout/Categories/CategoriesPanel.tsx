"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloseButtonSVG, OpenButtonSVG } from "@/components/reusable/svgs/CloseOpenSVG";
import { BlurEffect } from "@/components/reusable/svgs/BlurEffect";
import { BlurEffect2 } from "@/components/reusable/svgs/BlurEffect2";
import { BolitaEfectoClick } from "@/components/reusable/BolitaEfectoClick";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";
import { useCategoriesStore } from "@/store/categorySection";
import { InfiniteScrollCategories } from "./InfiniteScrollCategories";
import { Breadcrumbs } from "./Breadcrumbs/Breadcrumbs";
import { useCategoryLevel } from "./useCategoryLevel";
import { preloadParentCategories } from "./preloadCategories";

gsap.registerPlugin(useGSAP);

const IMAGE_POSITIONS = [
  { top: "10%", left: "17%", zIndex: 20 },
  { top: "25%", left: "8%", zIndex: 15 },
  { top: "45%", left: "16%", zIndex: 10 },
  { top: "10%", left: "72%", zIndex: 10 },
  { top: "29%", left: "80%", zIndex: 15 },
  { top: "55%", left: "74%", zIndex: 0 },
];

const CLIP_HIDDEN = "inset(100% 0% 0% 0%)";
const CLIP_SHOWN = "inset(0% 0% 0% 0%)";

export const CategoriesPanel = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const showCategories = useCategoriesStore((s) => s.showCategories);
  const closePanel = useCategoriesStore((s) => s.closePanel);
  const unmountPanel = useCategoriesStore((s) => s.unmountPanel);
  const { level, productsHref, navigate } = useCategoryLevel();

  const imagesByCategory = useImagesCategoriesStore((s) => s.imagesByCategory);
  const exitImagesByCategory = useImagesCategoriesStore((s) => s.exitImagesByCategory);
  const setImagesByCategory = useImagesCategoriesStore((s) => s.setImagesByCategory);
  const setExitImagesByCategory = useImagesCategoriesStore((s) => s.setExitImagesByCategory);

  useEffect(() => {
    void preloadParentCategories();
    return () => setImagesByCategory([]);
  }, [setImagesByCategory]);

  // Lock page scroll for as long as the panel is mounted (including its exit).
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel]);

  // Enter/exit reveal. The panel only unmounts once the exit has finished.
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.killTweensOf(section);

      if (showCategories) {
        if (reduceMotion) {
          gsap.fromTo(section, { autoAlpha: 0, clipPath: CLIP_SHOWN }, { autoAlpha: 1, duration: 0.15 });
        } else {
          gsap.fromTo(
            section,
            { clipPath: CLIP_HIDDEN },
            { clipPath: CLIP_SHOWN, duration: 0.45, ease: "power3.out" },
          );
        }
        return;
      }

      gsap.to(
        section,
        reduceMotion
          ? { autoAlpha: 0, duration: 0.15, onComplete: unmountPanel }
          : { clipPath: CLIP_HIDDEN, duration: 0.35, ease: "power2.in", onComplete: unmountPanel },
      );
    },
    { dependencies: [showCategories], scope: sectionRef },
  );

  // Hover images (pointer devices only, see IndividualCategory).
  useGSAP(
    () => {
      const overlays = imagesRef.current?.querySelectorAll(".overlay-image-effect");
      if (!overlays?.length) return;

      if (!exitImagesByCategory) {
        gsap.to(overlays, { yPercent: 100, duration: 0.8, ease: "power3.out" });
      } else {
        gsap.to(overlays, {
          yPercent: 0,
          duration: 0.15,
          ease: "power3.in",
          onComplete: () => {
            setImagesByCategory([]);
            setExitImagesByCategory(false);
          },
        });
      }
    },
    { dependencies: [imagesByCategory, exitImagesByCategory], scope: imagesRef },
  );

  const handleConfirm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = productsHref;
    closePanel(() => router.push(target));
  };

  return (
    <section
      ref={sectionRef}
      data-level={level}
      role="dialog"
      aria-modal="true"
      aria-label="Categorías"
      className="categories-section cursor-auto fixed inset-0 z-80 w-full h-dvh bg-off-white flex flex-col items-center justify-center overflow-hidden overscroll-none"
      style={{ clipPath: CLIP_HIDDEN }}
    >
      <InfiniteScrollCategories />

      {/* Close + "see products": the pill grows to reveal the arrow below the first level. */}
      <div className="categories-actions absolute z-50 top-4 right-4 md:top-12 md:right-20 flex items-center">
        <span aria-hidden className="categories-actions-pill absolute inset-y-0 left-0 rounded-full border border-black" />
        <button
          type="button"
          onClick={() => closePanel()}
          aria-label="Cerrar categorías"
          className="relative w-14 h-14 md:w-16 md:h-16 group flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-black"
        >
          <BolitaEfectoClick />
          <CloseButtonSVG className="w-6 h-6 md:w-7 md:h-7 stroke group-hover:stroke-2 transition-transform group-hover:scale-105" />
        </button>
        <Link
          href={productsHref}
          onClick={handleConfirm}
          aria-label="Ver productos"
          className="categories-open relative w-12 h-12 group flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-black"
        >
          <BolitaEfectoClick />
          <OpenButtonSVG className="w-6 h-6 md:w-7 md:h-7 stroke group-hover:stroke-2 transition-transform group-hover:scale-105" />
        </Link>
      </div>

      <div
        ref={imagesRef}
        aria-hidden
        className="fixed inset-0 z-10 select-none pointer-events-none w-full h-dvh"
      >
        {imagesByCategory.map((image, index) => (
          <div
            key={image.src}
            className="absolute h-max w-max overflow-hidden"
            style={IMAGE_POSITIONS[index % IMAGE_POSITIONS.length]}
          >
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
            <div className="overlay-image-effect absolute inset-0 bg-off-white" />
          </div>
        ))}
      </div>

      <Breadcrumbs
        id="bread-in-panel"
        className="absolute top-5 left-4 md:top-14 md:left-16 z-20"
        onNavigate={navigate}
      />

      {/* Decorative blobs: static blur, only translated during transitions. Skipped on phones. */}
      <div aria-hidden className="hidden md:block">
        <BlurEffect />
        <BlurEffect2 />
      </div>
    </section>
  );
};
