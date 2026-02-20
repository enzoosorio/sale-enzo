'use client';
import { OverviewProductsHero } from "@/components/main/OverviewProductsHero";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { products } from "@/lib/products";
import { ReactLenis, useLenis } from 'lenis/react'

export default function Home() {
  
  const lenis = useLenis((lenis) => {
    // called every scroll
    console.log(lenis)
  })

  return (
    <main className="relative mt-16 -z-20">
      <ReactLenis root />
      <SuperBarraBusqueda />
      {/* ayuda para el espaciado respecto al SuperBarraBusqueda que ahora es absoluto. */}
      <div className="h-10 "/>
      <OverviewProductsHero products={products} />
    </main>
  );
}
