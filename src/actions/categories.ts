"use server";

import { createClient } from "@/utils/supabase/server";

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  parent_id: string | null;
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Search root categories (parent_id IS NULL)
 * Returns last 5 created categories if no query provided
 */
export async function searchCategories(query?: string): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createClient();

    let queryBuilder = supabase
      .from("product_categories")
      .select("id, name, slug, created_at, parent_id")
      .is("parent_id", null) // Only root categories
      .order("created_at", { ascending: false });

    if (query && query.trim()) {
      queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
    } else {
      // Return last 5 categories if no query
      queryBuilder = queryBuilder.limit(5);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Error searching categories:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: any) {
    console.error("Unexpected error in searchCategories:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al buscar categorías"
    };
  }
}

/**
 * Create a new category
 * Generates slug from name automatically
 */
export async function createCategory(name: string): Promise<ActionResult<Category>> {
  try {
    if (!name || !name.trim()) {
      return {
        success: false,
        error: "El nombre de la categoría es requerido"
      };
    }

    const supabase = await createClient();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove duplicate hyphens

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("product_categories")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return {
        success: false,
        error: "Ya existe una categoría con este nombre"
      };
    }

    // Create category
    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        name: name.trim(),
        slug,
        parent_id: null
      })
      .select("id, name, slug, created_at, parent_id")
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };

  } catch (error: any) {
    console.error("Unexpected error in createCategory:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al crear categoría"
    };
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, created_at, parent_id")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching category:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data
    };

  } catch (error: any) {
    console.error("Unexpected error in getCategoryById:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al obtener categoría"
    };
  }
}

/**
 * Search subcategories by parent category ID
 * Returns subcategories that belong to the specified parent category
 */
export async function searchSubcategories(parentCategoryId: string, query?: string): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createClient();

    let queryBuilder = supabase
      .from("product_categories")
      .select("id, name, slug, created_at, parent_id")
      .eq("parent_id", parentCategoryId)
      .order("created_at", { ascending: false });

    if (query && query.trim()) {
      queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Error searching subcategories:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: any) {
    console.error("Unexpected error in searchSubcategories:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al buscar subcategorías"
    };
  }
}
