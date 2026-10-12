import { WholeProductStructure } from '@/types/products/products';
import Image from 'next/image';
import Link from 'next/link';

interface OverviewProductsHeroProps {
  products: WholeProductStructure[];
}

export const OverviewProductsHero = ({ products }: OverviewProductsHeroProps) => {
  return (
    <section className="section-overview w-full flex flex-col items-center justify-center py-8 gap-6">
      {/* Fluid grid on the page gutter: the column floor grows with the viewport so wide screens fill the width. */}
      <div className="products-wrapper w-full px-gutter py-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,clamp(9rem,10vw,12rem)),1fr))] gap-6 items-start">
        {products?.map((product, index) => {
          const paddedId = product.id.toString().padStart(2, '0');
          const imgSrc = product.variant.main_img_url || '/images/products/polo-1.png';
          return (
            <div key={product.id} className="w-full bg-white">
              <Link href={`/products/${product.id}`} className="flex flex-col items-center justify-center gap-2">
                <Image
                  src={imgSrc}
                  alt={product.name}
                  width={192}
                  height={240}
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 20vw, 12rem"
                  className="object-cover w-full h-auto"
                  priority={index === 0}
                />
                <span className="text-sm font-semibold">{paddedId}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
};
