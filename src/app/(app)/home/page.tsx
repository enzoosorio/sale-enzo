"use client";
import { OverviewProductsHero } from "@/components/main/OverviewProductsHero";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { products } from "@/lib/products";
import { useCategoriesStore } from "@/store/categorySection";
import { ReactLenis, useLenis } from "lenis/react";
import { useEffect } from "react";

export default function Home() {
  const { showCategories } = useCategoriesStore();
  const lenis = useLenis();

  // Pausar/reanudar Lenis cuando se abre/cierra el menú de categorías
  useEffect(() => {
    if (lenis) {
      if (showCategories) {
        lenis.stop();
      } else {
        lenis.start();
      }
    }
  }, [showCategories, lenis]);

  return (
    <>
      <ReactLenis root />
      <main className="main-home relative z-0">
        {/* filters & Sillye for overscrolling */}
        <div className="addons-wrapper absolute -top-12 right-32 z-30  flex items-center justify-center gap-12">
          {/* filters svg */}

          <button className="bg-white border border-black p-1 cursor-pointer ">
            <svg
              width="30"
              height="30"
              viewBox="0 0 32 32"
              fill="none"
              className="bg"
            >
              <g id="filters-svg">
                <path
                  id="Vector"
                  d="M5.33325 6.66667H13.3333M13.3333 6.66667C13.3333 8.13943 14.5271 9.33333 15.9999 9.33333C17.4727 9.33333 18.6666 8.13943 18.6666 6.66667M13.3333 6.66667C13.3333 5.19391 14.5271 4 15.9999 4C17.4727 4 18.6666 5.19391 18.6666 6.66667M18.6666 6.66667H26.6666M5.33325 16H21.3333M21.3333 16C21.3333 17.4728 22.5271 18.6667 23.9999 18.6667C25.4727 18.6667 26.6666 17.4728 26.6666 16C26.6666 14.5272 25.4727 13.3333 23.9999 13.3333C22.5271 13.3333 21.3333 14.5272 21.3333 16ZM10.6666 25.3333H26.6666M10.6666 25.3333C10.6666 23.8605 9.47268 22.6667 7.99992 22.6667C6.52716 22.6667 5.33325 23.8605 5.33325 25.3333C5.33325 26.8061 6.52716 28 7.99992 28C9.47268 28 10.6666 26.8061 10.6666 25.3333Z"
                  stroke="black"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </button>
          {/* sillye img TODO: png to svg */}
          <div className="cursor-pointer rounded-xl">
            <img
              src="/images/syllie/sillye-head-idle.png"
              alt="Sillye Head"
              className="w-full h-full"
            />
          </div>
        </div>
        {/* <div className="h-6 "/> */}
        <div className="relative mini-navbar-container bg-off-white  z-20 w-full flex pt-20 pb-6 items-center justify-center">
          <SuperBarraBusqueda />
        </div>
        {/* ayuda para el espaciado respecto al SuperBarraBusqueda que ahora es absoluto. */}
        <div className="h-5 " />
        <OverviewProductsHero products={products} />
      </main>
    </>
  );
}
