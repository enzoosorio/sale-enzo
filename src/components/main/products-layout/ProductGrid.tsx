import { forwardRef } from "react";
import { WholeProductStructure } from "@/types/products/products";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: WholeProductStructure[];
}

export const ProductGrid = forwardRef<HTMLElement, ProductGridProps>(
  ({ products,  }, ref) => {
    return (
      <section ref={ref} className="products-grid bg-off-white w-full">
        {products.map((product) => (
          <ProductCard key={product.item.id} product={product} />
        ))}
      </section>
    );
  }
);

ProductGrid.displayName = "ProductGrid";
