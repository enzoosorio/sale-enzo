import Link from 'next/link';
import { formatPrice } from '@/lib/images/media';
import { HomeProductImage } from './HomeProductImage';
import type { HomeProductCard } from '@/lib/products/homeProducts';

interface OverviewProductsHeroProps {
  products: HomeProductCard[];
}

export const OverviewProductsHero = ({ products }: OverviewProductsHeroProps) => {
  if (products.length === 0) {
    return (
      <section className="section-overview flex w-full flex-col items-center gap-4 px-gutter py-16 text-center text-[#221C1C]">
        <p className="font-nanum text-xl">Pronto subiremos nuevas prendas.</p>
        <p className="font-inria text-sm text-black/60">Vuelve en unos días para ver lo nuevo del catálogo.</p>
      </section>
    );
  }

  return (
    <section className="section-overview w-full flex flex-col items-center justify-center py-8 gap-6">
      {/* Fluid grid on the page gutter: the column floor grows with the viewport so wide screens fill the width. */}
      <ul className="products-wrapper w-full px-gutter py-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,clamp(9rem,10vw,12rem)),1fr))] gap-6 items-start">
        {products.map((product, index) => {
          return (
            <li key={product.id} className="w-full">
              <Link
                href={`/products/${product.id}`}
                className="group flex flex-col gap-2 text-[#221C1C] outline-offset-4"
              >
                <div className="relative aspect-4/5 w-full overflow-hidden bg-white">
                  <HomeProductImage src={product.imageUrl} alt={product.name} index={index} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="line-clamp-2 font-nanum text-sm leading-tight">{product.name}</h3>
                  <p className="font-inria text-sm">
                    {formatPrice(product.price)}
                    {product.compareAtPrice ? (
                      <span className="ml-2 text-xs text-black/40 line-through">{formatPrice(product.compareAtPrice)}</span>
                    ) : null}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/products"
        className="font-inria text-sm uppercase tracking-[0.08em] text-[#221C1C] underline underline-offset-4 hover:text-black/60"
      >
        Ver todas las prendas
      </Link>
    </section>
  );
};
