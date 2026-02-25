import { ProductCategory } from "@/schema";

/**
 * Categoría extendida con subcategorías anidadas
 */
export interface CategoryWithSubcategories extends ProductCategory {
  subcategories?: ProductCategory[];
}