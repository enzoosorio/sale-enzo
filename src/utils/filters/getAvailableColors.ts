import { createClient } from "@/utils/supabase/client";
import { VariantColorCategory } from "@/schema/variantColorCategorySchema";

/**
 * Tipo extendido para color con información adicional
 */
export interface ColorOption extends Pick<VariantColorCategory, 'id' | 'representative_hex' | 'label'> {
  count?: number; // Cantidad de variantes con este color
}

/**
 * Obtiene todos los colores disponibles de productos en una categoría específica (sin duplicados)
 * Los colores se obtienen a través de la relación:
 * products -> product_variants -> main_color_category_id -> variant_color_categories
 * 
 * @param {string} categoryId - UUID de la categoría (puede ser padre o subcategoría)
 * @returns {Promise<ColorOption[]>} Array de colores únicos con su información
 * 
 * @example
 * const colors = await getAvailableColorsByCategory("category-uuid");
 * // Devuelve: [
 * //   { id: "...", representative_hex: "#FF0000", label: "Rojo", count: 5 },
 * //   { id: "...", representative_hex: "#0000FF", label: "Azul", count: 3 }
 * // ]
 */
export async function getAvailableColorsByCategory(
  categoryId: string
): Promise<ColorOption[]> {
  const supabase = createClient();

  // Query para obtener colores distintos de productos en la categoría
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      main_color_category_id,
      variant_color_categories!inner(
        id,
        representative_hex,
        label
      ),
      products!inner(subcategory_id)
    `)
    .eq("products.subcategory_id", categoryId)
    .not("main_color_category_id", "is", null)
    .not("variant_color_categories.is_hidden", "eq", true); // Excluir colores ocultos

  if (error) {
    console.error(`Error fetching colors for category ${categoryId}:`, error);
    throw new Error(`Failed to fetch available colors: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Agrupar por color y contar ocurrencias
  const colorMap = new Map<string, ColorOption>();

  data.forEach((item: any) => {
    const colorId = item.variant_color_categories?.id;
    if (!colorId) return;

    if (colorMap.has(colorId)) {
      const existing = colorMap.get(colorId)!;
      colorMap.set(colorId, {
        ...existing,
        count: (existing.count || 0) + 1,
      });
    } else {
      colorMap.set(colorId, {
        id: colorId,
        representative_hex: item.variant_color_categories.representative_hex,
        label: item.variant_color_categories.label || "Sin nombre",
        count: 1,
      });
    }
  });

  // Convertir a array y ordenar por cantidad (más populares primero)
  return Array.from(colorMap.values()).sort((a, b) => {
    const countDiff = (b.count || 0) - (a.count || 0);
    // Si tienen la misma cantidad, ordenar alfabéticamente por label
    return countDiff !== 0 ? countDiff : (a.label || "").localeCompare(b.label || "");
  });
}

/**
 * Obtiene todos los colores disponibles en la base de datos (sin filtrar por categoría)
 * Solo devuelve colores que no están ocultos
 * 
 * @returns {Promise<ColorOption[]>} Array de colores únicos
 * 
 * @example
 * const allColors = await getAllAvailableColors();
 * // Devuelve: [
 * //   { id: "...", representative_hex: "#FF0000", label: "Rojo", count: 15 },
 * //   { id: "...", representative_hex: "#0000FF", label: "Azul", count: 10 }
 * // ]
 */
export async function getAllAvailableColors(): Promise<ColorOption[]> {
  const supabase = createClient();

  // Obtener todos los colores con su conteo de variantes
  const { data, error } = await supabase
    .from("variant_color_categories")
    .select(`
      id,
      representative_hex,
      label,
      color_count
    `)
    .eq("is_hidden", false)
    .order("color_count", { ascending: false });

  if (error) {
    console.error("Error fetching all colors:", error);
    throw new Error(`Failed to fetch all colors: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((color) => ({
    id: color.id,
    representative_hex: color.representative_hex,
    label: color.label || "Sin nombre",
    count: color.color_count || 0,
  }));
}

/**
 * Obtiene los colores más populares (con más variantes)
 * 
 * @param {number} limit - Cantidad máxima de colores a devolver (default: 10)
 * @returns {Promise<ColorOption[]>} Array de colores más populares
 * 
 * @example
 * const popularColors = await getPopularColors(5);
 * // Devuelve los 5 colores con más variantes
 */
export async function getPopularColors(limit: number = 10): Promise<ColorOption[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("variant_color_categories")
    .select(`
      id,
      representative_hex,
      label,
      color_count
    `)
    .eq("is_hidden", false)
    .order("color_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular colors:", error);
    throw new Error(`Failed to fetch popular colors: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((color) => ({
    id: color.id,
    representative_hex: color.representative_hex,
    label: color.label || "Sin nombre",
    count: color.color_count || 0,
  }));
}