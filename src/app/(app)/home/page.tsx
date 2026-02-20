'use client';
import { OverviewProductsHero } from "@/components/main/OverviewProductsHero";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { products } from "@/lib/products";
import { useCategoriesStore } from "@/store/categorySection";
import { ReactLenis, useLenis } from 'lenis/react'

export default function Home() {

  const {showCategories} = useCategoriesStore();

  return (
    <>
    <ReactLenis root />
    <main className={`main-home relative pt-20 z-0 `}
    // style={{
    //   pointerEvents: showCategories ? 'none' : 'auto'
    // }}
    >
      <SuperBarraBusqueda />
      {/* ayuda para el espaciado respecto al SuperBarraBusqueda que ahora es absoluto. */}
      <div className="h-10 "/>
      <OverviewProductsHero products={products} />
    </main>
    </>
  );
}
