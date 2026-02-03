"use server";

import { createClient } from "@/utils/supabase/server";

interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Search tags by name
 * Returns all tags if no query provided
 */
export async function searchTags(query?: string): Promise<ActionResult<Tag[]>> {
  try {
    const supabase = await createClient();

    let queryBuilder = supabase
      .from("tags")
      .select("id, name, slug, created_at")
      .order("name", { ascending: true });

    if (query && query.trim()) {
      queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Error searching tags:", error);
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
    console.error("Unexpected error in searchTags:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al buscar etiquetas"
    };
  }
}

/**
 * Create a new tag
 * Generates slug from name automatically
 */
export async function createTag(name: string): Promise<ActionResult<Tag>> {
  try {
    if (!name || !name.trim()) {
      return {
        success: false,
        error: "El nombre de la etiqueta es requerido"
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
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return {
        success: false,
        error: "Ya existe una etiqueta con este nombre"
      };
    }

    // Create tag
    const { data, error } = await supabase
      .from("tags")
      .insert({
        name: name.trim(),
        slug
      })
      .select("id, name, slug, created_at")
      .single();

    if (error) {
      console.error("Error creating tag:", error);
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
    console.error("Unexpected error in createTag:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al crear etiqueta"
    };
  }
}

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<ActionResult<Tag>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug, created_at")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching tag:", error);
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
    console.error("Unexpected error in getTagById:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al obtener etiqueta"
    };
  }
}

/**
 * Get multiple tags by IDs
 */
export async function getTagsByIds(ids: string[]): Promise<ActionResult<Tag[]>> {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug, created_at")
      .in("id", ids);

    if (error) {
      console.error("Error fetching tags:", error);
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
    console.error("Unexpected error in getTagsByIds:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al obtener etiquetas"
    };
  }
}
