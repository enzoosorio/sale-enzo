import { forwardRef } from "react";
import Link from "next/link";
import { WholeProductStructure } from "@/types/products/products";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: WholeProductStructure[];
}

/** Shown when the current category or filters match no piece. */
const EmptyProducts = () => (
  <div className="col-span-full flex flex-col items-start gap-3 px-gutter py-16 text-[#221C1C]">
    <p className="font-prata text-2xl">No hay prendas con esa combinación.</p>
    <p className="font-inria text-base text-black/60">Prueba quitando algún filtro, o mira todo lo que tengo por ahora.</p>
    <Link href="/products" className="font-inria text-sm uppercase tracking-[0.08em] underline underline-offset-4">
      Ver todas las prendas
    </Link>
  </div>
);

export const ProductGrid = forwardRef<HTMLElement, ProductGridProps>(
  ({ products,  }, ref) => {
    return (
      <section ref={ref} className="products-grid bg-off-white w-full">
        {products.length === 0 ? <EmptyProducts /> : null}
        {products.map((product) => (
          <ProductCard key={product.item.id} product={product} />
        ))}
      </section>
    );
  }
);

ProductGrid.displayName = "ProductGrid";
