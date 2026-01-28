import { WholeProductStructure } from "@/types/products/products";
import Link from "next/link";

interface OverviewProductsHeroProps {
  products: WholeProductStructure[];
}

export const OverviewProductsHero = ({
  products,
}: OverviewProductsHeroProps) => {
  return (
    <section className="w-full min-h-60 flex flex-col items-center justify-center py-8 gap-6">
      <div className="w-full max-w-5xl max-h-[520px] overflow-hidden xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-8 flex flex-wrap gap-6 items-center justify-center">
        {products &&
          products.map((product) => {
            const paddedId = product.id.toString().padStart(2, "0");
            return (
              <div
                key={product.id}
                className="w-36 xl:w-40 aspect-auto bg-white"
              >
                <Link href={`/products/${product.id}`} className="flex flex-col items-center justify-center gap-2">
                <img
                  src={product.variant.main_img_url || '/images/products/polo-1.png'}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                <span className="text-sm font-semibold">{paddedId}</span></Link>
              </div>
            );
          })}
      </div>
      <Link href="/products" className="linkk font-prata">Ver más productos</Link>
    </section>
  );
};
