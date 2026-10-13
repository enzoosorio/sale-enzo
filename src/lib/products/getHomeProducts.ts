import "server-only";
import { createClient } from "@/utils/supabase/server";
import { HOME_PRODUCTS_LIMIT, toHomeProductCards, type HomeProductCard, type HomeProductRow } from "./homeProducts";

/**
 * Newest sellable products for the home grid. The inner joins and item filters drop products
 * with nothing to sell in SQL; toHomeProductCards re-applies the rule and picks one card each.
 */
export async function getHomeProducts(limit: number = HOME_PRODUCTS_LIMIT): Promise<HomeProductCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, brand, is_active, created_at,
       product_variants!inner (
         id, main_img_url,
         product_items!inner ( id, price, compare_at_price, stock, status )
       )`,
    )
    .eq("is_active", true)
    .gt("product_variants.product_items.stock", 0)
    // A null status counts as available, matching coalesce(status, 'available') in the grid RPC.
    .or("status.is.null,status.in.(available,reserved)", { referencedTable: "product_variants.product_items" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Home products query failed: ${error.message}`);

  return toHomeProductCards((data ?? []) as HomeProductRow[], limit);
}
