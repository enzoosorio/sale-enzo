import { OverviewProductsHero } from '@/components/main/OverviewProductsHero';
import { SuperBarraBusqueda } from '@/components/reusable/CTA/SuperBarraBusqueda';
import { products } from '@/lib/products';


export default function Home() {
  return (
    <>
      <main className="main-home relative z-0">
        <div className="relative mini-navbar-container bg-off-white z-20 w-full flex px-4 pt-20 pb-6 items-center justify-center">
          <SuperBarraBusqueda />
        </div>
        <div className="h-5" />
        <OverviewProductsHero products={products} />
      </main>
    </>
  );
}
