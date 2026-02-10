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
 * Weighted Clustering Configuration
 * 
 * Main colors are strong signals (product's dominant color)
 * Secondary colors are weak signals (accents, details, borders)
 * 
 * Weights affect:
 * - Centroid evolution (weighted moving average)
 * - Cluster assignment threshold (secondary colors more tolerant)
 */

/**
 * Main color weight: Strong signal, high impact on centroid
 */
const MAIN_COLOR_WEIGHT = 1.0;

/**
 * Secondary color weight: Weak signal, low impact on centroid
 * Lower values (0.2-0.4) prevent noise from distorting clusters
 */
const SECONDARY_COLOR_WEIGHT = 0.3;

/**
 * Perceptual distance threshold for MAIN color assignment
 * 
 * Based on CIEDE2000 scale:
 * - 0-1: Just Noticeable Difference (JND)
 * - 1-5: Subtle but clear difference
 * - 5-15: Moderate difference
 * - 15-30: Large difference
 * - 30+: Very different colors
 */
const MAIN_COLOR_THRESHOLD = 15;

/**
 * Perceptual distance threshold for SECONDARY color assignment
 * 
 * Higher than main threshold to prevent creating too many clusters
 * from visual noise (accents, borders, reflections, etc.)
 */
const SECONDARY_COLOR_THRESHOLD = 25;

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
  weight: number; // Weight used for this color (1.0 for main, 0.3 for secondary)
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
  weighted_count: number; // Sum of weights for weighted moving average
  is_locked: boolean;
  is_hidden: boolean;
  label: string | null;
}

/**
 * Main clustering function with WEIGHTED support
 * 
 * Determines whether to assign a color to an existing cluster or create a new one.
 * Updates centroids using weighted moving average.
 * 
 * @param hex - HEX color string (e.g., "#FF5733")
 * @param weight - Weight of this color (1.0 for main, 0.3 for secondary). Default: 1.0
 * @returns ColorClusterResult with cluster assignment
 * @throws Error if color processing fails
 */
export async function getOrCreateColorCluster(
  hex: string,
  weight: number = MAIN_COLOR_WEIGHT
): Promise<ColorClusterResult> {
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

  // Step 4: Determine threshold based on weight
  // Secondary colors (weight < 1.0) use higher threshold to avoid over-clustering
  const threshold = weight >= MAIN_COLOR_WEIGHT 
    ? MAIN_COLOR_THRESHOLD 
    : SECONDARY_COLOR_THRESHOLD;

  // Step 5: Find nearest cluster
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

  // Step 6: Decision logic using dynamic threshold
  if (nearestCluster && minDistance <= threshold) {
    // CASE A: Assign to existing cluster
    return await assignToExistingCluster(nearestCluster, lab, hex, weight);
  } else {
    // CASE B: Create new cluster
    return await createNewCluster(lab, hex, weight);
  }
}

/**
 * Assign color to existing cluster and update centroid
 * 
 * Uses WEIGHTED moving average formula:
 * new_centroid = (old_centroid * old_weight_sum + new_color * weight) / (old_weight_sum + weight)
 * 
 * This allows centroids to evolve gradually without sudden drift.
 * Main colors (weight=1.0) have stronger influence than secondary colors (weight=0.3).
 */
async function assignToExistingCluster(
  cluster: ColorCluster,
  lab: LAB,
  hex: string,
  weight: number
): Promise<ColorClusterResult> {
  const oldWeightSum = cluster.weighted_count;
  const newWeightSum = oldWeightSum + weight;
  const oldCount = cluster.color_count;
  const newCount = oldCount + 1;

  // Calculate new centroid using WEIGHTED moving average
  const newCentroid: LAB = {
    l: (cluster.centroid_l * oldWeightSum + lab.l * weight) / newWeightSum,
    a: (cluster.centroid_a * oldWeightSum + lab.a * weight) / newWeightSum,
    b: (cluster.centroid_b * oldWeightSum + lab.b * weight) / newWeightSum,
  };

  // Update cluster in database
  const { error: updateError } = await supabaseAdmin
    .from("variant_color_categories")
    .update({
      centroid_l: newCentroid.l,
      centroid_a: newCentroid.a,
      centroid_b: newCentroid.b,
      color_count: newCount,
      weighted_count: newWeightSum,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cluster.id);

  if (updateError) {
    console.error("Error updating cluster centroid:", updateError);
    throw new Error(`Failed to update cluster: ${updateError.message}`);
  }

  console.log(`✓ Assigned color ${hex} to cluster ${cluster.id} (weight: ${weight}, deltaE: ${deltaE2000(lab, {
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
    weight,
  };
}

/**
 * Create a new color cluster
 * 
 * Initial centroid = the color itself
 * Initial count = 1
 * Initial weighted_count = weight of the first color
 * 
 * CRITICAL: Explicitly generates UUID to avoid database null constraint violations
 */
async function createNewCluster(lab: LAB, hex: string, weight: number): Promise<ColorClusterResult> {
  // Validate LAB values before insert
  if (lab.l < 0 || lab.l > 100) {
    throw new Error(`Invalid L value: ${lab.l}. Must be between 0-100`);
  }
  if (lab.a < -128 || lab.a > 127) {
    throw new Error(`Invalid a value: ${lab.a}. Must be between -128 and 127`);
  }
  if (lab.b < -128 || lab.b > 127) {
    throw new Error(`Invalid b value: ${lab.b}. Must be between -128 and 127`);
  }
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid representative_hex: ${hex}`);
  }

  // Generate UUID explicitly (Supabase may not have gen_random_uuid() default set)
  const clusterId = crypto.randomUUID();

  const { data: newCluster, error: createError } = await supabaseAdmin
    .from("variant_color_categories")
    .insert({
      id: clusterId, // ✅ Explicit UUID generation
      centroid_l: lab.l,
      centroid_a: lab.a,
      centroid_b: lab.b,
      representative_hex: hex,
      color_count: 1,
      weighted_count: weight, // Initial weighted count = weight of first color
      is_locked: false,
      is_hidden: false,
      label: null, // Can be set manually later by admin
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating new cluster:", createError);
    throw new Error(`Failed to create cluster: ${createError.message}`);
  }

  // Guard: Verify cluster was created with valid ID
  if (!newCluster || !newCluster.id) {
    throw new Error("Cluster creation failed: missing id in response");
  }

  console.log(`✓ Created new cluster ${newCluster.id} for color ${hex} (weight: ${weight})`);

  return {
    color_category_id: newCluster.id,
    l: lab.l,
    a: lab.a,
    b: lab.b,
    representative_hex: hex,
    is_new_cluster: true,
    weight,
  };
}

/**
 * Process secondary colors for a variant
 * 
 * This function handles multiple colors extracted from a variant image.
 * Each color goes through the clustering pipeline with REDUCED WEIGHT.
 * 
 * Secondary colors use:
 * - Weight: 0.3 (vs 1.0 for main colors)
 * - Threshold: 25 (vs 15 for main colors)
 * 
 * This prevents visual noise from creating excessive clusters.
 * 
 * CRITICAL: This function FAILS LOUDLY on clustering errors.
 * Secondary color failure BLOCKS variant creation to ensure data integrity.
 * 
 * @param variantId - UUID of the variant
 * @param colorHexArray - Array of HEX color strings
 * @throws Error if clustering fails for any color
 */
export async function processSecondaryColors(
  variantId: string,
  colorHexArray: string[]
): Promise<void> {
  if (!colorHexArray || colorHexArray.length === 0) {
    return;
  }

  // Validate input
  if (!variantId || typeof variantId !== 'string') {
    throw new Error('Invalid variantId provided to processSecondaryColors');
  }

  const colorsToInsert: Array<{
    id: string;
    variant_id: string;
    color_category_id: string;
    original_hex: string;
    l: number;
    a: number;
    b: number;
    weight: number;
  }> = [];

  // Process each color through clustering pipeline with SECONDARY WEIGHT
  // ⚠️ NO TRY-CATCH: Let errors propagate to block variant creation
  for (const hex of colorHexArray) {
    const clusterResult = await getOrCreateColorCluster(hex, SECONDARY_COLOR_WEIGHT);

    // Guard: Ensure cluster result is valid
    if (!clusterResult.color_category_id) {
      throw new Error(`Clustering returned invalid result for color ${hex}: missing color_category_id`);
    }

    // Generate UUID explicitly (same as variant_color_categories)
    const colorId = crypto.randomUUID();

    colorsToInsert.push({
      id: colorId, // ✅ Explicit UUID generation
      variant_id: variantId,
      color_category_id: clusterResult.color_category_id,
      original_hex: hex,
      l: clusterResult.l,
      a: clusterResult.a,
      b: clusterResult.b,
      weight: clusterResult.weight, // Persist weight (0.3 for secondary colors)
    });
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
