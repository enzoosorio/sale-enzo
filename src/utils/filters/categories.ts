import { createClient } from "@/utils/supabase/client";
import { ProductCategory } from "@/schema/categorySchema";

/**
 * Categoría extendida con subcategorías anidadas
 */
export interface CategoryWithSubcategories extends ProductCategory {
  subcategories?: ProductCategory[];
}

/**
 * Obtiene todas las categorías padre (categorías de primer nivel)
 * Las categorías padre son aquellas donde parent_id es null
 * 
 * @returns {Promise<ProductCategory[]>} Array de categorías padre
 * 
 * @example
 * const categories = await getParentCategories();
 * // Devuelve: [{ id: "...", name: "Ropa Superior", slug: "ropa-superior", parent_id: null, ... }]
 */
export async function getParentCategories(): Promise<ProductCategory[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .is("parent_id", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching parent categories:", error);
    throw new Error(`Failed to fetch parent categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Obtiene todas las subcategorías de una categoría padre específica
 * 
 * @param {string} parentId - UUID de la categoría padre
 * @returns {Promise<ProductCategory[]>} Array de subcategorías
 * 
 * @example
 * const subcategories = await getSubcategoriesByParentId("parent-category-uuid");
 * // Devuelve: [{ id: "...", name: "Polos", slug: "polos", parent_id: "parent-category-uuid", ... }]
 */
export async function getSubcategoriesByParentId(
  parentId: string
): Promise<ProductCategory[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("parent_id", parentId)
    .order("name", { ascending: true });

  if (error) {
    console.error(`Error fetching subcategories for parent ${parentId}:`, error);
    throw new Error(`Failed to fetch subcategories: ${error.message}`);
  }

  return data || [];
}

/**
 * Obtiene todas las categorías padre con sus subcategorías anidadas
 * 
 * @returns {Promise<CategoryWithSubcategories[]>} Array de categorías con subcategorías
 * 
 * @example
 * const categoriesWithSubs = await getCategoriesWithSubcategories();
 * // Devuelve: [
 * //   { 
 * //     id: "...", 
 * //     name: "Ropa Superior", 
 * //     subcategories: [
 * //       { id: "...", name: "Polos", ... },
 * //       { id: "...", name: "Camisas", ... }
 * //     ]
 * //   }
 * // ]
 */
export async function getCategoriesWithSubcategories(): Promise<CategoryWithSubcategories[]> {
  const parentCategories = await getParentCategories();
  
  const categoriesWithSubs = await Promise.all(
    parentCategories.map(async (category) => {
      const subcategories = await getSubcategoriesByParentId(category.id);
      return {
        ...category,
        subcategories,
      };
    })
  );

  return categoriesWithSubs;
}

/**
 * Obtiene todas las subcategorías (sin importar su categoría padre)
 * Útil para obtener un listado completo de subcategorías con valores únicos
 * 
 * @returns {Promise<ProductCategory[]>} Array de todas las subcategorías
 */
export async function getAllSubcategories(): Promise<ProductCategory[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .not("parent_id", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching all subcategories:", error);
    throw new Error(`Failed to fetch subcategories: ${error.message}`);
  }

  return data || [];
}


/**
 * TODO: DATOS MOCK TEMPORALES - ELIMINAR CUANDO SE AGREGUEN A LA BASE DE DATOS
 * 
 * Subcategorías de ejemplo para desarrollo/testing
 * Estas deben ser agregadas a la base de datos y luego este mock debe ser eliminado
 * 
 * ESTRUCTURA DE CATEGORÍAS PLANEADA:
 * - Ropa Superior: Polos, Camisas, Blusas, Sweaters, Hoodies, Chaquetas, Chalecos
 * - Ropa Inferior: Pantalones, Jeans, Shorts, Faldas, Leggings
 * - Calzado: Zapatillas, Zapatos Formales, Sandalias, Botas
 * - Accesorios: Gorras, Bufandas, Cinturones, Bolsos, Mochilas, Relojes
 * - Random: Pijamas, Ropa Deportiva, Trajes de Baño, Ropa Interior
 */
export const MOCK_SUBCATEGORIES: Partial<ProductCategory>[] = [
  // Ropa Superior (estas ya deberían existir en tu BD)
  { name: "Polos", slug: "polos" },
  { name: "Camisas", slug: "camisas" },
  { name: "Blusas", slug: "blusas" },
  { name: "Sweaters", slug: "sweaters" },
  { name: "Hoodies", slug: "hoodies" },
  { name: "Chaquetas", slug: "chaquetas" },
  { name: "Chalecos", slug: "chalecos" },
  
  // Ropa Inferior
  { name: "Pantalones", slug: "pantalones" },
  { name: "Jeans", slug: "jeans" },
  { name: "Shorts", slug: "shorts" },
  { name: "Faldas", slug: "faldas" },
  { name: "Leggings", slug: "leggings" },
  
  // Calzado
  { name: "Zapatillas", slug: "zapatillas" },
  { name: "Zapatos Formales", slug: "zapatos-formales" },
  { name: "Sandalias", slug: "sandalias" },
  { name: "Botas", slug: "botas" },
  
  // Accesorios
  { name: "Gorras", slug: "gorras" },
  { name: "Bufandas", slug: "bufandas" },
  { name: "Cinturones", slug: "cinturones" },
  { name: "Bolsos", slug: "bolsos" },
  { name: "Mochilas", slug: "mochilas" },
  { name: "Relojes", slug: "relojes" },
  
  // Random
  { name: "Pijamas", slug: "pijamas" },
  { name: "Ropa Deportiva", slug: "ropa-deportiva" },
  { name: "Trajes de Baño", slug: "trajes-de-bano" },
  { name: "Ropa Interior", slug: "ropa-interior" },
];
