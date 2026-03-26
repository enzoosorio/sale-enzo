"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { WholeProductStructure } from "@/types/products/products";
import { ProductGrid } from "./ProductGrid";
import { AsideFilters } from "./AsideFilters";
import { ProductsFastNav } from "./ProductsFastNav";
import { finalBackground, initialBackground } from "@/app/(app)/home/page";

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);

interface ProductsLayoutProps {
  products: WholeProductStructure[];
  title: string;
}

export const ProductsLayout = ({ products, title }: ProductsLayoutProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [layoutActive, setLayoutActive] = useState(false);
  const gridRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const tlFastBar = useRef<gsap.core.Timeline | null>(null);
  const fastNavTriggerRef = useRef<ScrollTrigger | null>(null);
  const isFirstMount = useRef(true);

  const createFastNavScrollTrigger = () => {
    // Matar cualquier trigger anterior
    if (fastNavTriggerRef.current) {
      fastNavTriggerRef.current.kill();
      fastNavTriggerRef.current = null;
    }
    // Matar timeline anterior si existe
    if (tlFastBar.current) {
      tlFastBar.current.kill();
      tlFastBar.current = null;
    }

    // Resetear estilos de las subcategorías a su estado inicial
    gsap.set('.other-subcategories-fast-nav', {
      opacity: 0,
      pointerEvents: 'none',
    });

    let animatingFastBar = false;

    // Crear nuevo timeline
    tlFastBar.current = gsap.timeline({ paused: true });
    tlFastBar.current.to('.other-subcategories-fast-nav', {
      opacity: 1,
      pointerEvents: 'auto',
      duration: 0.3,
      stagger: { each: 0.25, from: "start" },
      ease: "circ.out"
    }, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        id: "fastNavTrigger",
        trigger: ".fast-nav-wrapper",
        start: "top top",
        end: () => {
          const productSection = document.querySelector(".products-section");
          const sectionHeight = productSection ? productSection.clientHeight : 0;
          return `+=${sectionHeight - 100}`;
        },
        pin: '.fast-nav-wrapper',
        pinSpacing: false,
        invalidateOnRefresh: true,
        scrub: true,
        markers: true,
        onUpdate: (self) => {
          const progress = self.progress;
          if (progress > 0.03 && !animatingFastBar && tlFastBar.current) {
            gsap.to(".title-main", {
              fontSize: "1.8rem",
              duration: 1.2,
              ease: "power2.out",
            });
            animatingFastBar = true;
            // Asegurar que la timeline se reproduce desde el principio
            tlFastBar.current.progress(0).play();
          } else if (progress <= 0.03 && animatingFastBar && tlFastBar.current) {
            gsap.to(".title-main", {
              fontSize: "6rem",
              duration: 1.2,
              ease: "power2.out",
            });
            animatingFastBar = false;
            // Reproducir hacia atrás desde el final
            tlFastBar.current.progress(1).reverse();
          }
        }
      }
    });
    tl.to('.fast-nav-wrapper', { top: 0, ease: "power2.out", duration: 0.5 }, 0);
    tl.fromTo(".fast-nav-wrapper",
      { background: initialBackground },
      {
        background: finalBackground,
        backdropFilter: "blur(16px)",
        ease: "elastic.out(1,1)",
        duration: 0.025,
      },
      0
    );

    fastNavTriggerRef.current = tl.scrollTrigger!;

    // Sincronizar estado inicial con el progress actual del ScrollTrigger
    if (fastNavTriggerRef.current && fastNavTriggerRef.current.progress > 0.105) {
      // Forzar estado de animación activado
      gsap.set(".title-main", { fontSize: "1.8rem", overwrite: true });
      if (tlFastBar.current) {
        tlFastBar.current.progress(1);
      }
      animatingFastBar = true;
    } else {
      // Asegurar que el timeline esté en progreso 0
      if (tlFastBar.current) {
        tlFastBar.current.progress(0);
      }
    }
    console.log("FastNav ScrollTrigger creado con ID:");
    ScrollTrigger.refresh();
    return tl;
  };


  // useEffect para crear el ScrollTrigger al montar el componente
  useEffect(() => {
    createFastNavScrollTrigger();
    return () => killFastNavTrigger();
  }, []);

  const killFastNavTrigger = () => {
    if (fastNavTriggerRef.current) {
      fastNavTriggerRef.current.kill();
      fastNavTriggerRef.current = null;
    }
    if (tlFastBar.current) {
      tlFastBar.current.kill();
      tlFastBar.current = null;
    }
    // Resetear estilos
    gsap.set('.other-subcategories-fast-nav', {
      opacity: 0,
      pointerEvents: 'none',
    });
    gsap.killTweensOf(".title-main");

  };

  const activateLayout = () => {
    if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

    const container = containerRef.current;
    const currentScroll = window.scrollY;

    killFastNavTrigger();

    gsap.set(".fast-nav-wrapper", { visibility: "hidden", opacity: 0 });

    const state = Flip.getState([
      container,
      gridRef.current,
      sidebarRef.current,
    ]);

    container.classList.add("layout-active");

    Flip.from(state, {
      duration: 1,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      stagger: 0.01,
      onComplete: () => {
        ScrollTrigger.refresh();
        window.scrollTo(0, currentScroll);
        const tl = gsap.timeline();
        tl.to(sidebarRef.current, { opacity: 1, duration: 0.1 }, 0);
        tl.to(".subcategory-title", { color: "#fff", duration: 0.35 }, 0.05);
        tl.to(".title-main", { opacity: 0, duration: 0.35 }, 0.06);
        tl.to(".overlay-filters", { x: "-100%", duration: 0.5 }, 0.05);

        setIsAnimating(false);
      },
    });
  };
  const deactivateLayout = () => {
    if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

    const container = containerRef.current;
    const currentScroll = window.scrollY;

    killFastNavTrigger();

    gsap.set(".fast-nav-wrapper", { visibility: "hidden", opacity: 0 });

    const state = Flip.getState([
      container,
      gridRef.current,
      sidebarRef.current,
    ]);

    container.classList.remove("layout-active");

    Flip.from(state, {
      duration: 1,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      stagger: 0.01,
      onComplete: () => {
        gsap.set(".fast-nav-wrapper", { visibility: "visible", opacity: 1 });
        createFastNavScrollTrigger();

        ScrollTrigger.refresh();
        window.scrollTo(0, currentScroll);

        gsap.to(".fast-nav-wrapper", {
          opacity: 1,
          pointerEvents: "auto",
          duration: 0.1,
        });
        setIsAnimating(false);
      },
    });
  };
  useGSAP(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return; // No ejecutar animaciones al montar
    }

    if (layoutActive) {
      setIsAnimating(true);
      const tl = gsap.timeline();
      tl.to(
        ".fast-nav-wrapper",
        {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.25,
        },
        0,
      ).then(() => {
        activateLayout();
      });
    } else {
      setIsAnimating(true);
      const tl = gsap.timeline();
      tl.to(
        ".subcategory-title",
        { color: "#221C1C", duration: 0.1 },
        0,
      ).to(
        ".title-main",
        { opacity: 1, duration: 0.1 },
        0.05,
      );
      tl.to(
        ".overlay-filters",
        { x: "0%", duration: 0.5 },
        0,
      );
      tl.to(
        sidebarRef.current,
        { opacity: 0, duration: 0.1 },
        ">0.05",
      ).then(() => {
        deactivateLayout();

      });
    }
  }, [layoutActive]);

  return (
    <main className="main-products">
      <section className="products-section w-full min-h-screen overflow-clip flex flex-col items-start justify-start gap-0 relative pb-20">
        <div
          ref={containerRef}
          className={`wrapper-pf relative grid grid-cols-1 grid-rows-2 pb-32 w-screen gap-0`}
        >
          <div className="absolute top-14 left-0 pl-8 translate-y-0 row-span-1">
            <p className="font-prata text-sm px-2 py-1">
              Polos / Sweatshirts / Pants / Accessories
            </p>
          </div>
          <ProductsFastNav
            subcategories={[
              { href: "polos", name: "POLOS" },
              { href: "sweatshirts", name: "SWEATSHIRTS" },
              { href: "pants", name: "PANTS" },
              { href: "accessories", name: "ACCESSORIES" },
            ]}
          />
          <aside
            ref={sidebarRef}
            className="relative filters-wrapper overflow-y-auto px-4 py-3 text-white transition-colors"
          >
            <h1 className="subcategory-title pl-4 pt-7 font-prata text-6xl">
              {title}
            </h1>
            <AsideFilters />
            <div className="overlay-filters fixed inset-0 w-full h-screen bg-off-white" />
          </aside>
          <ProductGrid ref={gridRef} products={products} />
        </div>
      </section>
      <button
        onClick={() => {
          if (isAnimating) return;
          setLayoutActive(!layoutActive);
        }}
        className={`filter-button fixed bottom-8 right-8 z-50
         bg-black/5 stroke stroke-[rgba(181,179,179,0.6)] 
         backdrop-blur-md shadow rounded-full p-3.5 w-16
         ${isAnimating ? "pointer-events-none cursor-not-allowed opacity-50" : "pointer-events-auto cursor-pointer opacity-100"}
         `}
      >
        <svg viewBox="0 0 32 32" fill="none" className="stroke-black">
          <g id="filters-svg">
            <path
              id="Vector"
              d="M5.33301 6.66667H13.333M13.333 6.66667C13.333 8.13943 14.5269 9.33333 15.9997 9.33333C17.4725 9.33333 18.6663 8.13943 18.6663 6.66667M13.333 6.66667C13.333 5.19391 14.5269 4 15.9997 4C17.4725 4 18.6663 5.19391 18.6663 6.66667M18.6663 6.66667H26.6663M5.33301 16H21.333M21.333 16C21.333 17.4728 22.5269 18.6667 23.9997 18.6667C25.4725 18.6667 26.6663 17.4728 26.6663 16C26.6663 14.5272 25.4725 13.3333 23.9997 13.3333C22.5269 13.3333 21.333 14.5272 21.333 16ZM10.6663 25.3333H26.6663M10.6663 25.3333C10.6663 23.8605 9.47243 22.6667 7.99967 22.6667C6.52691 22.6667 5.33301 23.8605 5.33301 25.3333C5.33301 26.8061 6.52691 28 7.99967 28C9.47243 28 10.6663 26.8061 10.6663 25.3333Z"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </button>
    </main>
  );
};