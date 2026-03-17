import { forwardRef } from "react";
import { WholeProductStructure } from "@/types/products/products";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: WholeProductStructure[];
}

export const ProductGrid = forwardRef<HTMLElement, ProductGridProps>(
  ({ products,  }, ref) => {
    return (
      <section ref={ref} className={`products-grid w-full pt-40 pb-16 px-4 transition-all`}>
        {products.map((product, index) => (
            // TODO: CAMBIAR LA KEY, USAR ID DE SUPABASE (uuid) EN LUGAR DE INDEX
          <ProductCard key={index} product={product} />
        ))}
      </section>
    );
  }
);

ProductGrid.displayName = "ProductGrid";
