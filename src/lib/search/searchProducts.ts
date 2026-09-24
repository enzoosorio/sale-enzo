import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { WholeProductStructure } from "@/types/products/products";
import { embedQuery, normalizeSearchQuery } from "./embedQuery";

interface RpcRow {
  product: Omit<WholeProductStructure, "variant" | "item">;
  variant: WholeProductStructure["variant"];
  item: WholeProductStructure["item"];
  score: number;
}

interface RpcPayload {
  products: RpcRow[];
  total_count: number;
}

export interface SearchProduct extends WholeProductStructure {
  score: number;
}

export async function searchProducts(query: string, limit = 24): Promise<{
  products: SearchProduct[];
  total_count: number;
  mode: "hybrid" | "text";
}> {
  const normalized = normalizeSearchQuery(query);
  let embedding: number[] | null = null;
  try {
    embedding = await embedQuery(normalized);
  } catch (error) {
    console.warn("Search embedding unavailable; using text search", error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_products_hybrid", {
    p_query: normalized,
    p_query_embedding: embedding ? `[${embedding.join(",")}]` : null,
    p_match_count: limit,
  });
  if (error) throw new Error(`Search RPC failed: ${error.message}`);
  const payload = (data ?? { products: [], total_count: 0 }) as RpcPayload;
  return {
    products: payload.products.map((row) => ({
      ...row.product,
      variant: row.variant,
      item: row.item,
      score: row.score,
    })),
    total_count: payload.total_count,
    mode: embedding ? "hybrid" : "text",
  };
}
