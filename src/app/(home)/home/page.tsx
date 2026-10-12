import { OverviewProductsHero } from '@/components/main/OverviewProductsHero';
import { getHomeProducts } from '@/lib/products/getHomeProducts';


export default async function Home() {
  const products = await getHomeProducts();

  return (
    <main className="main-home relative z-0">
      {/* Reserves the hero room where the header's search bar rests before it docks (HomeSearchDock). */}
      <div aria-hidden="true" className="h-(--dock-space)" />
      <OverviewProductsHero products={products} />
    </main>
  );
}
