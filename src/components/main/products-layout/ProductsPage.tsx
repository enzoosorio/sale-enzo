import { WholeProductStructure } from "@/types/products/products";
import { ProductsLayout } from "./ProductsLayout";

interface ProductsPageProps {
  products: WholeProductStructure[];
  title?: string;
}

export const ProductsPage = ({ products, title = "POLOS" }: ProductsPageProps) => {
  return <ProductsLayout products={products} title={title} />;
};
