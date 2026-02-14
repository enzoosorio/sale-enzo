import { createClient } from "@/utils/supabase/client";

/**
 * Orden estándar de tallas de ropa
 */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * Obtiene todos los tamaños disponibles de productos en una categoría específica (sin duplicados)
 * Usa DISTINCT en la query para evitar duplicados directamente desde la base de datos
 * 
 * @param {string} categoryId - UUID de la categoría (puede ser padre o subcategoría)
 * @returns {Promise<string[]>} Array de tamaños únicos ordenados
 * 
 * @example
 * const sizes = await getAvailableSizesByCategory("category-uuid");
 * // Devuelve: ["S", "M", "L", "XL"]
 */
export async function getAvailableSizesByCategory(
  categoryId: string
): Promise<string[]> {
  const supabase = createClient();

  // Query para obtener tamaños distintos de productos en la categoría
  // products -> subcategory_id (puede apuntar a una categoría o subcategoría)
  // product_variants -> size
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      size,
      products!inner(subcategory_id)
    `)
    .eq("products.subcategory_id", categoryId)
    .not("size", "is", null);

  if (error) {
    console.error(`Error fetching sizes for category ${categoryId}:`, error);
    throw new Error(`Failed to fetch available sizes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Extraer tamaños únicos y filtrar nulls
  const uniqueSizes = [...new Set(data.map((item) => item.size).filter(Boolean))] as string[];

  // Ordenar por el orden estándar de tallas
  return uniqueSizes.sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
    const indexB = SIZE_ORDER.indexOf(b.toUpperCase());

    // Si ambos están en el array de orden, ordenar por posición
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // Si solo uno está en el array, ese va primero
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Si ninguno está en el array, ordenar alfabéticamente
    return a.localeCompare(b);
  });
}

/**
 * Obtiene todos los tamaños disponibles en la base de datos (sin filtrar por categoría)
 * Útil para obtener un listado completo de todos los tamaños disponibles
 * 
 * @returns {Promise<string[]>} Array de tamaños únicos ordenados
 * 
 * @example
 * const allSizes = await getAllAvailableSizes();
 * // Devuelve: ["XS", "S", "M", "L", "XL", "XXL"]
 */
export async function getAllAvailableSizes(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select("size")
    .not("size", "is", null);

  if (error) {
    console.error("Error fetching all sizes:", error);
    throw new Error(`Failed to fetch all sizes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Extraer tamaños únicos
  const uniqueSizes = [...new Set(data.map((item) => item.size).filter(Boolean))] as string[];

  // Ordenar por el orden estándar
  return uniqueSizes.sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
    const indexB = SIZE_ORDER.indexOf(b.toUpperCase());

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}