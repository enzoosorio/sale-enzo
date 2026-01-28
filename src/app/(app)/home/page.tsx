import { OverviewProductsHero } from "@/components/main/OverviewProductsHero";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { products } from "@/lib/products";

export default function Home() {
  return (
    <main className="relative mt-16">
      <SuperBarraBusqueda />
      {/* ayuda para el espaciado respecto al SuperBarraBusqueda que ahora es absoluto. */}
      <div className="h-10 "/>
      <OverviewProductsHero products={products} />
    </main>
  );
}
