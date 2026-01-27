import { Colors, Product, Size } from "@/types/products/products";

// const COLORS_LIBRARY : Record<Colors, string> = {
//     "Red" : "#F73333",
//     "Blue" : "#0D61E1",
//     "Green" : "#33C14A",
//     "Black" : "#000000",
//     "White" : "#FFFFFF",
//     "Yellow" : "#FFDD33",
//     "Purple" : "#9B33FF",
//     "Gray" : "#888888",
// }

//  // Obtener sizes disponibles dinámicamente por categoría
//   export const getAvailableSizes = (category: string, products: Product[]): Size[] => {
//     const categoryProducts = products.filter((p) => p.category === category);
//     const uniqueSizes = [...new Set(categoryProducts.map((p) => p.size))];
//     return uniqueSizes.sort((a, b) => {
//       const sizeOrder: Size[] = ALL_SIZES;
//       return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
//     });
//   };