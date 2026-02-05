"use server";

/**
 * Color Clustering Pipeline
 * 
 * This module implements ONLINE LEARNING color clustering.
 * 
 * Key principles:
 * 1. Clusters are NOT predefined
 * 2. Clusters EMERGE from real product data
 * 3. Centroids evolve via moving average
 * 4. Perceptual distance (deltaE2000) drives decisions
 * 5. All operations are server-side and atomic
 * 
 * Flow:
 * HEX → LAB → find nearest centroid → assign OR create → update centroid
 */

import { supabaseAdmin } from "../supabase/supabase-admin";
import { hexToLab, LAB, isValidHex } from "./labConversion";
import { deltaE2000 } from "./deltaE";

/**
 * Perceptual distance threshold for cluster assignment
 * 
 * Based on CIEDE2000 scale:
 * - 0-1: Just Noticeable Difference (JND)
 * - 1-5: Subtle but clear difference
 * - 5-15: Moderate difference
 * - 15-30: Large difference
 * - 30+: Very different colors
 * 
 * A threshold of 15 means:
 * "If the color is within moderate perceptual distance, assign to existing cluster.
 *  Otherwise, create a new cluster."
 * 
 * Tuning guidance:
 * - Lower (5-10): More clusters, finer distinctions
 * - Higher (20-30): Fewer clusters, broader grouping
 */
const CLUSTER_THRESHOLD = 15;

/**
 * Result of color clustering operation
 */
export interface ColorClusterResult {
  color_category_id: string;
  l: number;
  a: number;
  b: number;
  representative_hex: string;
  is_new_cluster: boolean;
}

/**
 * Database representation of a color cluster
 */
interface ColorCluster {
  id: string;
  centroid_l: number;
  centroid_a: number;
  centroid_b: number;
  representative_hex: string;
  color_count: number;
  is_locked: boolean;
  is_hidden: boolean;
  label: string | null;
}

/**
 * Main clustering function
 * 
 * Determines whether to assign a color to an existing cluster or create a new one.
 * Updates centroids using online learning (moving average).
 * 
 * @param hex - HEX color string (e.g., "#FF5733")
 * @returns ColorClusterResult with cluster assignment
 * @throws Error if color processing fails
 */
export async function getOrCreateColorCluster(hex: string): Promise<ColorClusterResult> {
  // Step 1: Validate input
  if (!isValidHex(hex)) {
    throw new Error(`Invalid HEX color: ${hex}`);
  }

  // Step 2: Convert HEX → LAB
  const lab = hexToLab(hex);

  // Step 3: Fetch candidate clusters
  // Only non-hidden clusters are candidates
  // Locked clusters CAN still receive colors (they just can't be manually edited)
  const { data: clusters, error: fetchError } = await supabaseAdmin
    .from("variant_color_categories")
    .select("*")
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Error fetching color clusters:", fetchError);
    throw new Error(`Failed to fetch color clusters: ${fetchError.message}`);
  }

  // Step 4: Find nearest cluster
  let nearestCluster: ColorCluster | null = null;
  let minDistance = Infinity;

  if (clusters && clusters.length > 0) {
    for (const cluster of clusters) {
      const centroid: LAB = {
        l: cluster.centroid_l,
        a: cluster.centroid_a,
        b: cluster.centroid_b,
      };

      const distance = deltaE2000(lab, centroid);

      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = cluster;
      }
    }
  }

  // Step 5: Decision logic
  if (nearestCluster && minDistance <= CLUSTER_THRESHOLD) {
    // CASE A: Assign to existing cluster
    return await assignToExistingCluster(nearestCluster, lab, hex);
  } else {
    // CASE B: Create new cluster
    return await createNewCluster(lab, hex);
  }
}

/**
 * Assign color to existing cluster and update centroid
 * 
 * Uses moving average formula:
 * new_centroid = (old_centroid * count + new_color) / (count + 1)
 * 
 * This allows centroids to evolve gradually without sudden drift.
 */
async function assignToExistingCluster(
  cluster: ColorCluster,
  lab: LAB,
  hex: string
): Promise<ColorClusterResult> {
  const oldCount = cluster.color_count;
  const newCount = oldCount + 1;

  // Calculate new centroid using moving average
  const newCentroid: LAB = {
    l: (cluster.centroid_l * oldCount + lab.l) / newCount,
    a: (cluster.centroid_a * oldCount + lab.a) / newCount,
    b: (cluster.centroid_b * oldCount + lab.b) / newCount,
  };

  // Update cluster in database
  const { error: updateError } = await supabaseAdmin
    .from("variant_color_categories")
    .update({
      centroid_l: newCentroid.l,
      centroid_a: newCentroid.a,
      centroid_b: newCentroid.b,
      color_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cluster.id);

  if (updateError) {
    console.error("Error updating cluster centroid:", updateError);
    throw new Error(`Failed to update cluster: ${updateError.message}`);
  }

  console.log(`✓ Assigned color ${hex} to existing cluster ${cluster.id} (deltaE: ${deltaE2000(lab, {
    l: cluster.centroid_l,
    a: cluster.centroid_a,
    b: cluster.centroid_b
  }).toFixed(2)})`);

  return {
    color_category_id: cluster.id,
    l: lab.l,
    a: lab.a,
    b: lab.b,
    representative_hex: hex,
    is_new_cluster: false,
  };
}

/**
 * Create a new color cluster
 * 
 * Initial centroid = the color itself
 * Initial count = 1
 */
async function createNewCluster(lab: LAB, hex: string): Promise<ColorClusterResult> {
  const { data: newCluster, error: createError } = await supabaseAdmin
    .from("variant_color_categories")
    .insert({
      centroid_l: lab.l,
      centroid_a: lab.a,
      centroid_b: lab.b,
      representative_hex: hex,
      color_count: 1,
      is_locked: false,
      is_hidden: false,
      label: null, // Can be set manually later by admin
    })
    .select()
    .single();

  if (createError || !newCluster) {
    console.error("Error creating new cluster:", createError);
    throw new Error(`Failed to create cluster: ${createError?.message || "Unknown error"}`);
  }

  console.log(`✓ Created new cluster ${newCluster.id} for color ${hex}`);

  return {
    color_category_id: newCluster.id,
    l: lab.l,
    a: lab.a,
    b: lab.b,
    representative_hex: hex,
    is_new_cluster: true,
  };
}

/**
 * Process secondary colors for a variant
 * 
 * This function handles multiple colors extracted from a variant image.
 * Each color goes through the same clustering pipeline.
 * 
 * @param variantId - UUID of the variant
 * @param colorHexArray - Array of HEX color strings
 * @returns Array of created variant_colors records
 */
export async function processSecondaryColors(
  variantId: string,
  colorHexArray: string[]
): Promise<void> {
  if (!colorHexArray || colorHexArray.length === 0) {
    return;
  }

  const colorsToInsert: Array<{
    variant_id: string;
    color_category_id: string;
    original_hex: string;
    l: number;
    a: number;
    b: number;
  }> = [];

  // Process each color through clustering pipeline
  for (const hex of colorHexArray) {
    try {
      const clusterResult = await getOrCreateColorCluster(hex);

      colorsToInsert.push({
        variant_id: variantId,
        color_category_id: clusterResult.color_category_id,
        original_hex: hex,
        l: clusterResult.l,
        a: clusterResult.a,
        b: clusterResult.b,
      });
    } catch (error) {
      console.error(`Failed to process secondary color ${hex}:`, error);
      // Continue processing other colors even if one fails
    }
  }

  // Bulk insert all secondary colors
  if (colorsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("variant_colors")
      .insert(colorsToInsert);

    if (insertError) {
      console.error("Error inserting secondary colors:", insertError);
      throw new Error(`Failed to insert secondary colors: ${insertError.message}`);
    }

    console.log(`✓ Inserted ${colorsToInsert.length} secondary colors for variant ${variantId}`);
  }
}

/**
 * Get all active color clusters
 * 
 * Useful for:
 * - Admin dashboards
 * - Color filter UI
 * - Analytics
 */
export async function getAllColorClusters() {
  const { data, error } = await supabaseAdmin
    .from("variant_color_categories")
    .select("*")
    .eq("is_hidden", false)
    .order("color_count", { ascending: false });

  if (error) {
    console.error("Error fetching color clusters:", error);
    throw new Error(`Failed to fetch clusters: ${error.message}`);
  }

  return data;
}

/**
 * Get cluster statistics
 * 
 * @param clusterId - UUID of the cluster
 * @returns Cluster with variant count
 */
export async function getClusterStats(clusterId: string) {
  // Get cluster details
  const { data: cluster, error: clusterError } = await supabaseAdmin
    .from("variant_color_categories")
    .select("*")
    .eq("id", clusterId)
    .single();

  if (clusterError || !cluster) {
    throw new Error(`Cluster not found: ${clusterId}`);
  }

  // Count variants using this cluster as main color
  const { count: mainColorCount, error: mainCountError } = await supabaseAdmin
    .from("product_variants")
    .select("*", { count: "exact", head: true })
    .eq("main_color_category_id", clusterId);

  // Count secondary color references
  const { count: secondaryColorCount, error: secondaryCountError } = await supabaseAdmin
    .from("variant_colors")
    .select("*", { count: "exact", head: true })
    .eq("color_category_id", clusterId);

  return {
    ...cluster,
    main_color_usage: mainColorCount || 0,
    secondary_color_usage: secondaryColorCount || 0,
    total_usage: (mainColorCount || 0) + (secondaryColorCount || 0),
  };
}
