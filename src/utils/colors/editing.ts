"use server";

/**
 * Color Editing Utilities
 * 
 * Functions for managing color edits and cluster weight adjustments.
 * These are NOT yet integrated into the UI but provide the foundation
 * for future editing capabilities.
 * 
 * Key principles:
 * - Maintain weighted_count integrity when removing/adding colors
 * - Mark orphaned clusters as hidden (never delete)
 * - Main colors require special handling (full re-clustering)
 * - Secondary colors can be edited more freely
 */

import { supabaseAdmin } from "../supabase/supabase-admin";
import { getOrCreateColorCluster } from "./clustering";

/**
 * Weight constants (must match clustering.ts)
 */
const MAIN_COLOR_WEIGHT = 1.0;
const SECONDARY_COLOR_WEIGHT = 0.3;

/**
 * Threshold for marking a cluster as orphaned
 * If weighted_count falls to this or below, cluster is hidden
 */
const ORPHAN_THRESHOLD = 0.01;

/**
 * Result of a color edit operation
 */
interface ColorEditResult {
  success: boolean;
  error?: string;
  old_cluster_id?: string;
  new_cluster_id?: string;
  was_cluster_orphaned?: boolean;
}

/**
 * Remove a color's weight contribution from its cluster
 * 
 * This is a critical operation that must maintain cluster integrity.
 * Called before reassigning a color to a different cluster.
 * 
 * @param clusterId - UUID of the cluster to update
 * @param weight - Weight to subtract (usually 0.3 for secondary, 1.0 for main)
 * @returns Updated cluster data
 */
async function removeWeightFromCluster(
  clusterId: string,
  weight: number
): Promise<{ success: boolean; was_orphaned: boolean; error?: string }> {
  // Fetch current cluster state
  const { data: cluster, error: fetchError } = await supabaseAdmin
    .from("variant_color_categories")
    .select("*")
    .eq("id", clusterId)
    .single();

  if (fetchError || !cluster) {
    return {
      success: false,
      was_orphaned: false,
      error: `Failed to fetch cluster: ${fetchError?.message}`,
    };
  }

  // Calculate new values
  const newCount = Math.max(0, cluster.color_count - 1);
  const newWeightedCount = Math.max(0, cluster.weighted_count - weight);

  // Check if cluster becomes orphaned
  const isOrphaned = newWeightedCount <= ORPHAN_THRESHOLD;

  // Update cluster
  const { error: updateError } = await supabaseAdmin
    .from("variant_color_categories")
    .update({
      color_count: newCount,
      weighted_count: newWeightedCount,
      is_hidden: isOrphaned, // Mark as hidden if orphaned
      updated_at: new Date().toISOString(),
    })
    .eq("id", clusterId);

  if (updateError) {
    return {
      success: false,
      was_orphaned: false,
      error: `Failed to update cluster: ${updateError.message}`,
    };
  }

  console.log(
    `✓ Removed weight ${weight} from cluster ${clusterId} (new weighted_count: ${newWeightedCount}, orphaned: ${isOrphaned})`
  );

  return {
    success: true,
    was_orphaned: isOrphaned,
  };
}

/**
 * Edit a secondary color
 * 
 * This function:
 * 1. Removes weight contribution from old cluster
 * 2. Re-clusters the new color
 * 3. Updates variant_colors record
 * 4. Marks old cluster as hidden if orphaned
 * 
 * @param variantColorId - UUID of the variant_colors record
 * @param newHex - New HEX color value
 * @returns Result with success status and cluster IDs
 */
export async function editSecondaryColor(
  variantColorId: string,
  newHex: string
): Promise<ColorEditResult> {
  try {
    // Step 1: Fetch current color record
    const { data: oldColor, error: fetchError } = await supabaseAdmin
      .from("variant_colors")
      .select("*")
      .eq("id", variantColorId)
      .single();

    if (fetchError || !oldColor) {
      return {
        success: false,
        error: `Failed to fetch color: ${fetchError?.message}`,
      };
    }

    // Step 2: Remove weight from old cluster
    const removeResult = await removeWeightFromCluster(
      oldColor.color_category_id,
      oldColor.weight
    );

    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error,
      };
    }

    // Step 3: Cluster new color (always use secondary weight for this table)
    const newCluster = await getOrCreateColorCluster(newHex, SECONDARY_COLOR_WEIGHT);

    // Step 4: Update variant_colors record
    const { error: updateError } = await supabaseAdmin
      .from("variant_colors")
      .update({
        color_category_id: newCluster.color_category_id,
        original_hex: newHex,
        l: newCluster.l,
        a: newCluster.a,
        b: newCluster.b,
        weight: newCluster.weight,
      })
      .eq("id", variantColorId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update color: ${updateError.message}`,
      };
    }

    console.log(
      `✓ Edited secondary color ${variantColorId}: ${oldColor.original_hex} → ${newHex}`
    );

    return {
      success: true,
      old_cluster_id: oldColor.color_category_id,
      new_cluster_id: newCluster.color_category_id,
      was_cluster_orphaned: removeResult.was_orphaned,
    };
  } catch (error: any) {
    console.error("Error editing secondary color:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove a secondary color entirely
 * 
 * This function:
 * 1. Removes weight contribution from cluster
 * 2. Deletes variant_colors record
 * 3. Marks cluster as hidden if orphaned
 * 
 * @param variantColorId - UUID of the variant_colors record
 * @returns Result with success status
 */
export async function removeSecondaryColor(
  variantColorId: string
): Promise<ColorEditResult> {
  try {
    // Step 1: Fetch current color record
    const { data: color, error: fetchError } = await supabaseAdmin
      .from("variant_colors")
      .select("*")
      .eq("id", variantColorId)
      .single();

    if (fetchError || !color) {
      return {
        success: false,
        error: `Failed to fetch color: ${fetchError?.message}`,
      };
    }

    // Step 2: Remove weight from cluster
    const removeResult = await removeWeightFromCluster(
      color.color_category_id,
      color.weight
    );

    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error,
      };
    }

    // Step 3: Delete variant_colors record
    const { error: deleteError } = await supabaseAdmin
      .from("variant_colors")
      .delete()
      .eq("id", variantColorId);

    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete color: ${deleteError.message}`,
      };
    }

    console.log(`✓ Removed secondary color ${variantColorId}`);

    return {
      success: true,
      old_cluster_id: color.color_category_id,
      was_cluster_orphaned: removeResult.was_orphaned,
    };
  } catch (error: any) {
    console.error("Error removing secondary color:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Edit a main color (COMPLEX OPERATION)
 * 
 * Main colors are stored in product_variants, not variant_colors.
 * Editing requires:
 * 1. Removing weight from old cluster (weight: 1.0)
 * 2. Re-clustering with new color
 * 3. Updating product_variants
 * 4. Marking old cluster as hidden if orphaned
 * 
 * ⚠️ WARNING: This operation does NOT recalculate the old cluster's centroid.
 * The centroid will remain as-is, which may cause slight drift over time.
 * For critical applications, consider implementing full centroid recalculation.
 * 
 * @param variantId - UUID of the product variant
 * @param newHex - New HEX color value
 * @returns Result with success status and cluster IDs
 */
export async function editMainColor(
  variantId: string,
  newHex: string
): Promise<ColorEditResult> {
  try {
    // Step 1: Fetch current variant
    const { data: variant, error: fetchError } = await supabaseAdmin
      .from("product_variants")
      .select("main_color_hex, main_color_category_id")
      .eq("id", variantId)
      .single();

    if (fetchError || !variant) {
      return {
        success: false,
        error: `Failed to fetch variant: ${fetchError?.message}`,
      };
    }

    if (!variant.main_color_category_id) {
      return {
        success: false,
        error: "Variant has no main color category assigned",
      };
    }

    // Step 2: Remove main weight from old cluster
    const removeResult = await removeWeightFromCluster(
      variant.main_color_category_id,
      MAIN_COLOR_WEIGHT
    );

    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error,
      };
    }

    // Step 3: Cluster new color (use main weight)
    const newCluster = await getOrCreateColorCluster(newHex, MAIN_COLOR_WEIGHT);

    // Step 4: Update product_variants
    const { error: updateError } = await supabaseAdmin
      .from("product_variants")
      .update({
        main_color_hex: newHex,
        main_color_category_id: newCluster.color_category_id,
      })
      .eq("id", variantId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update variant: ${updateError.message}`,
      };
    }

    console.log(
      `✓ Edited main color for variant ${variantId}: ${variant.main_color_hex} → ${newHex}`
    );

    return {
      success: true,
      old_cluster_id: variant.main_color_category_id,
      new_cluster_id: newCluster.color_category_id,
      was_cluster_orphaned: removeResult.was_orphaned,
    };
  } catch (error: any) {
    console.error("Error editing main color:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Manually mark a cluster as hidden
 * 
 * Useful for:
 * - Hiding clusters that are no longer relevant
 * - Admin cleanup operations
 * - Managing cluster quality
 * 
 * @param clusterId - UUID of the cluster
 * @returns Success status
 */
export async function hideCluster(
  clusterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("variant_color_categories")
      .update({
        is_hidden: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clusterId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`✓ Marked cluster ${clusterId} as hidden`);

    return { success: true };
  } catch (error: any) {
    console.error("Error hiding cluster:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Restore a hidden cluster
 * 
 * @param clusterId - UUID of the cluster
 * @returns Success status
 */
export async function unhideCluster(
  clusterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("variant_color_categories")
      .update({
        is_hidden: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clusterId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`✓ Restored cluster ${clusterId} (unhidden)`);

    return { success: true };
  } catch (error: any) {
    console.error("Error restoring cluster:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get all orphaned clusters
 * 
 * Returns clusters that have been marked as hidden due to low weighted_count.
 * Useful for admin dashboards and cleanup operations.
 * 
 * @returns Array of orphaned clusters
 */
export async function getOrphanedClusters() {
  try {
    const { data: clusters, error } = await supabaseAdmin
      .from("variant_color_categories")
      .select("*")
      .eq("is_hidden", true)
      .lte("weighted_count", ORPHAN_THRESHOLD)
      .order("updated_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: clusters || [],
    };
  } catch (error: any) {
    console.error("Error fetching orphaned clusters:", error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}
