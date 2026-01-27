import { Product, Size } from "@/types/products/products";

const ALL_SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

 // Obtener sizes disponibles dinámicamente por categoría
  export const getAvailableSizes = (category: string, products: Product[]): Size[] => {
    const categoryProducts = products.filter((p) => p.category === category);
    const uniqueSizes = [...new Set(categoryProducts.map((p) => p.size))];
    return uniqueSizes.sort((a, b) => {
      const sizeOrder: Size[] = ALL_SIZES;
      return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
    });
  };