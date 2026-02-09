'use server';

import { createClient } from "@/utils/supabase/server";


export async function searchBrands(query?: string) {

    const supabase = await createClient();

    let queryBuilder = supabase
      .from("products")
      .select("brand")
      .order("created_at", { ascending: false });

    if (query && query.trim()) {
      queryBuilder = queryBuilder.ilike("brand", `%${query.trim()}%`);
    } else {
      // Return last 5 brands if no query
      queryBuilder = queryBuilder.limit(5);
    }
    const { data, error } = await queryBuilder;

    if (error) {
      console.error("Error searching brands:", error);
      return {
        success: false,
        error: error.message
      };
    }
    // Extract unique brands from results
    const uniqueBrands = Array.from(new Set(data?.map(item => item.brand).filter(Boolean)));

    return {
      success: true,
      data: uniqueBrands.map(name => ({ name }))
    };
}