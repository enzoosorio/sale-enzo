'use server';

import { createClient } from "@/utils/supabase/server";
import { assignClusterLabel } from "@/utils/colors/clustering";

// ============================================================================
// Types
// ============================================================================

export interface RecalculationResult {
  processed: number;
  failed: number;
  errors?: Array<{ id: string; hex: string; error: string }>;
}

// ============================================================================
// Label Update Server Action
// ============================================================================

/**
 * Updates the editable label for a cluster
 * This is the user-controlled label that can override the suggested label
 */
export async function updateClusterLabel(
  clusterId: string,
  newLabel: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Validate inputs
    if (!clusterId) {
      return { success: false, error: 'Cluster ID is required' };
    }

    // Allow empty string to clear the label
    const trimmedLabel = newLabel.trim();

    const { error } = await supabase
      .from('variant_color_categories')
      .update({
        label: trimmedLabel || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId);

    if (error) {
      console.error('Error updating cluster label:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Fatal error updating cluster label:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Accept Suggested Label Server Action
// ============================================================================

/**
 * Copies the suggested_label to the editable label field
 * This allows admins to accept the automatically computed label
 */
export async function acceptSuggestedLabel(
  clusterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    if (!clusterId) {
      return { success: false, error: 'Cluster ID is required' };
    }

    // First, fetch the cluster to get the suggested_label
    const { data: cluster, error: fetchError } = await supabase
      .from('variant_color_categories')
      .select('suggested_label')
      .eq('id', clusterId)
      .single();

    if (fetchError) {
      console.error('Error fetching cluster:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!cluster?.suggested_label) {
      return { success: false, error: 'No suggested label available' };
    }

    // Update the label with the suggested_label value
    const { error: updateError } = await supabase
      .from('variant_color_categories')
      .update({
        label: cluster.suggested_label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId);

    if (updateError) {
      console.error('Error updating cluster label:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Fatal error accepting suggested label:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Bulk Recalculation Server Action
// ============================================================================

/**
 * Recalculates perceptual color names for all clusters
 * This is a one-time bulk operation that updates all suggested_label and label values
 */
export async function recalculateAllLabels(): Promise<RecalculationResult> {
  const result: RecalculationResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const supabase = await createClient();

    // Fetch all clusters
    const { data: clusters, error: fetchError } = await supabase
      .from('variant_color_categories')
      .select('id, representative_hex');

    if (fetchError) {
      console.error('Error fetching clusters:', fetchError);
      throw new Error('Failed to fetch color clusters');
    }

    if (!clusters || clusters.length === 0) {
      return result;
    }

    console.log(`Starting recalculation for ${clusters.length} clusters...`);

    // Process each cluster
    for (const cluster of clusters) {
      try {
        await assignClusterLabel(cluster.id);
        result.processed++;
      } catch (error) {
        console.error(`Error recalculating cluster ${cluster.id}:`, error);
        result.failed++;
        result.errors?.push({
          id: cluster.id,
          hex: cluster.representative_hex,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Fatal error in recalculateAllLabels:', error);
    throw error;
  }
}
