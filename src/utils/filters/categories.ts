import { createClient } from "../supabase/client";
import { ProductCategory } from "@/schema/categorySchema";
import { CategoryWithSubcategories } from "@/types/cat";


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
 * Validates that a subcategory belongs to the given parent category (SERVER VERSION)
 * Used in Server Components for URL validation
 * 
 * @param {string} categorySlug - Parent category slug
 * @param {string} subcategorySlug - Subcategory slug
 * @returns {Promise<boolean>} True if hierarchy is valid
 */
export async function validateCategoryHierarchyServer(
  categorySlug: string,
  subcategorySlug: string
): Promise<boolean> {
  const supabase = createClient();
  
  // Normalize slugs to lowercase
  const normalizedCategorySlug = categorySlug.toLowerCase();
  const normalizedSubcategorySlug = subcategorySlug.toLowerCase();
  
  console.log('[SERVER] Validating:', { normalizedCategorySlug, normalizedSubcategorySlug });

  // Get parent category
  const { data: parentCategories, error: parentError } = await supabase
    .from("product_categories")
    .select("id, slug, name")
    .eq("slug", normalizedCategorySlug)
    .is("parent_id", null)
    .limit(1);

  console.log('[SERVER] Parent query result:', { parentCategories, error: parentError?.message });

  if (parentError || !parentCategories || parentCategories.length === 0) {
    console.error(`[validateHierarchy SERVER] Parent "${categorySlug}" not found:`, {
      error: parentError?.message,
      normalizedSlug: normalizedCategorySlug,
    });
    return false;
  }

  const parent = parentCategories[0];

  // Get subcategory
  const { data: subcategories, error: subError } = await supabase
    .from("product_categories")
    .select("id, parent_id, slug, name")
    .eq("slug", normalizedSubcategorySlug)
    .not("parent_id", "is", null)
    .limit(1);

  console.log('[SERVER] Subcategory query result:', { subcategories, error: subError?.message });

  if (subError || !subcategories || subcategories.length === 0) {
    console.error(`[validateHierarchy SERVER] Subcategory "${subcategorySlug}" not found:`, {
      error: subError?.message,
      normalizedSlug: normalizedSubcategorySlug,
    });
    return false;
  }

  const subcategory = subcategories[0];
  const isValid = subcategory.parent_id === parent.id;
  
  console.log(`[validateHierarchy SERVER] ${categorySlug} -> ${subcategorySlug}:`, {
    parentId: parent.id,
    parentName: parent.name,
    subcategoryId: subcategory.id,
    subcategoryName: subcategory.name,
    subcategoryParentId: subcategory.parent_id,
    isValid,
  });

  return isValid;
}

/**
 * Finds the parent category for a given subcategory slug
 * Used for URL hierarchy validation
 * 
 * @param {string} subcategorySlug - Slug of the subcategory
 * @returns {Promise<ProductCategory | null>} Parent category or null if not found
 * 
 * @example
 * const parent = await findParentCategoryBySubcategorySlug("polos");
 * // Returns: { id: "...", name: "Ropa Superior", slug: "ropa-superior", ... }
 */
export async function findParentCategoryBySubcategorySlug(
  subcategorySlug: string
): Promise<ProductCategory | null> {
  const supabase = createClient();
  
  // Normalize slug to lowercase for case-insensitive comparison
  const normalizedSlug = subcategorySlug.toLowerCase();
  
  // First, find the subcategory by slug (case-insensitive)
  // Use limit(1) to handle potential duplicates and take the first match
  const { data: subcategories, error: subError } = await supabase
    .from("product_categories")
    .select("*")
    .ilike("slug", normalizedSlug)
    .not("parent_id", "is", null)
    .limit(1);

  if (subError || !subcategories || subcategories.length === 0) {
    console.error(`[findParentCategory] Subcategory "${subcategorySlug}" not found:`, subError?.message);
    return null;
  }

  const subcategory = subcategories[0];

  // Then, fetch the parent category by ID (exact match)
  const { data: parent, error: parentError } = await supabase
    .from("product_categories")
    .select("*")
    .eq("id", subcategory.parent_id)
    .maybeSingle();

  if (parentError || !parent) {
    console.error(`[findParentCategory] Parent for "${subcategorySlug}" not found:`, parentError?.message);
    return null;
  }

  return parent;
}

/**
 * Validates that a subcategory belongs to the given parent category
 * 
 * @param {string} categorySlug - Parent category slug
 * @param {string} subcategorySlug - Subcategory slug
 * @returns {Promise<boolean>} True if hierarchy is valid
 * 
 * @example
 * const isValid = await validateCategoryHierarchy("ropa-superior", "polos");
 * // Returns: true if "polos" is a child of "ropa-superior"
 */
export async function validateCategoryHierarchy(
  categorySlug: string,
  subcategorySlug: string
): Promise<boolean> {
  const supabase = createClient();
  
  // Normalize slugs to lowercase for case-insensitive comparison
  const normalizedCategorySlug = categorySlug.toLowerCase();
  const normalizedSubcategorySlug = subcategorySlug.toLowerCase();
  
  console.log({normalizedCategorySlug})
  console.log({normalizedSubcategorySlug})

  // Get parent category (case-insensitive slug lookup)
  // Use limit(1) to handle potential duplicates
  const { data: parentCategories, error: parentError } = await supabase
    .from("product_categories")
    .select("id, slug, name")
    .eq("slug", normalizedCategorySlug)

  console.log({parentCategories})

  if (parentError || !parentCategories || parentCategories.length === 0) {
    console.error(`[validateHierarchy] Parent category "${categorySlug}" not found:`, {
      error: parentError?.message,
      normalizedSlug: normalizedCategorySlug,
    });
    return false;
  }

  const parent = parentCategories[0];

  // Check if subcategory belongs to this parent (case-insensitive)
  // Use limit(1) to handle potential duplicates
  const { data: subcategories, error: subError } = await supabase
    .from("product_categories")
    .select("id, parent_id, slug, name")
    .ilike("slug", normalizedSubcategorySlug)
    .not("parent_id", "is", null)
    .limit(1);

  if (subError || !subcategories || subcategories.length === 0) {
    console.error(`[validateHierarchy] Subcategory "${subcategorySlug}" not found:`, {
      error: subError?.message,
      normalizedSlug: normalizedSubcategorySlug,
    });
    return false;
  }

  const subcategory = subcategories[0];
  const isValid = subcategory.parent_id === parent.id;
  
  console.log(`[validateHierarchy] ${categorySlug} -> ${subcategorySlug}:`, {
    parentId: parent.id,
    parentName: parent.name,
    subcategoryId: subcategory.id,
    subcategoryName: subcategory.name,
    subcategoryParentId: subcategory.parent_id,
    isValid,
  });

  return isValid;
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
// export const MOCK_SUBCATEGORIES: Partial<ProductCategory>[] = [
//   // Ropa Superior (estas ya deberían existir en tu BD)
//   { name: "Polos", slug: "polos" },
//   { name: "Camisas", slug: "camisas" },
//   { name: "Blusas", slug: "blusas" },
//   { name: "Sweaters", slug: "sweaters" },
//   { name: "Hoodies", slug: "hoodies" },
//   { name: "Chaquetas", slug: "chaquetas" },
//   { name: "Chalecos", slug: "chalecos" },
  
//   // Ropa Inferior
//   { name: "Pantalones", slug: "pantalones" },
//   { name: "Jeans", slug: "jeans" },
//   { name: "Shorts", slug: "shorts" },
//   { name: "Faldas", slug: "faldas" },
//   { name: "Leggings", slug: "leggings" },
  
//   // Calzado
//   { name: "Zapatillas", slug: "zapatillas" },
//   { name: "Zapatos Formales", slug: "zapatos-formales" },
//   { name: "Sandalias", slug: "sandalias" },
//   { name: "Botas", slug: "botas" },
  
//   // Accesorios
//   { name: "Gorras", slug: "gorras" },
//   { name: "Bufandas", slug: "bufandas" },
//   { name: "Cinturones", slug: "cinturones" },
//   { name: "Bolsos", slug: "bolsos" },
//   { name: "Mochilas", slug: "mochilas" },
//   { name: "Relojes", slug: "relojes" },
  
//   // Random
//   { name: "Pijamas", slug: "pijamas" },
//   { name: "Ropa Deportiva", slug: "ropa-deportiva" },
//   { name: "Trajes de Baño", slug: "trajes-de-bano" },
//   { name: "Ropa Interior", slug: "ropa-interior" },
// ];
