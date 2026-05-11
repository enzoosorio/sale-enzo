import { WholeProductStructure } from '@/types/products/products';
import Image from 'next/image';
import Link from 'next/link';

interface OverviewProductsHeroProps {
  products: WholeProductStructure[];
}

export const OverviewProductsHero = ({ products }: OverviewProductsHeroProps) => {
  return (
    <section className="section-overview w-full flex flex-col items-center justify-center py-8 gap-6">
      <div className="products-wrapper w-full max-w-5xl overflow-hidden xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-8 flex flex-wrap gap-6 items-center justify-center">
        {products?.map((product, index) => {
          const paddedId = product.id.toString().padStart(2, '0');
          const imgSrc = product.variant.main_img_url || '/images/products/polo-1.png';
          return (
            <div key={product.id} className="w-36 xl:w-40 aspect-auto bg-white">
              <Link href={`/products/${product.id}`} className="flex flex-col items-center justify-center gap-2">
                <Image
                  src={imgSrc}
                  alt={product.name}
                  width={160}
                  height={200}
                  sizes="(max-width: 1280px) 144px, 160px"
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
