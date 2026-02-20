/**
 * Bulk Recalculation Script: Cluster Labels
 * 
 * Purpose: Recalculate perceptual color names for all existing clusters
 * 
 * This script:
 * - Fetches all clusters from variant_color_categories
 * - For each cluster, calls assignClusterLabel()
 * - Updates suggested_label and label with nearest perceptual color
 * - Processes sequentially (not in parallel)
 * - Logs progress
 * - Fails loudly on errors
 * 
 * Usage:
 *   npx tsx scripts/recalculateClusterLabels.ts
 * 
 * When to run:
 * - After initial color_base_names seeding
 * - After updating the color dictionary
 * - To fix/refresh all cluster labels
 * 
 * IMPORTANT: This will overwrite ALL cluster labels (including manually set ones)
 */

import { createClient } from '@supabase/supabase-js';
import { assignClusterLabel } from '../src/utils/colors/clustering';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const LOG_INTERVAL = 10; // Log progress every N clusters

// ============================================================================
// Validation
// ============================================================================

function validateEnvironment() {
  if (!SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
}

// ============================================================================
// Main Recalculation Logic
// ============================================================================

async function recalculateClusterLabels() {
  console.log('🚀 Starting Cluster Label Recalculation...\n');
  
  // Step 1: Validate environment
  console.log('✓ Validating environment variables...');
  validateEnvironment();
  
  // Step 2: Initialize Supabase client
  console.log('✓ Initializing Supabase client...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Step 3: Fetch all clusters
  console.log('✓ Fetching all color clusters...');
  
  const { data: clusters, error: fetchError } = await supabase
    .from('variant_color_categories')
    .select('id, representative_hex, centroid_l, centroid_a, centroid_b, label, is_locked')
    .order('created_at', { ascending: true });
  
  if (fetchError) {
    throw new Error(`Failed to fetch clusters: ${fetchError.message}`);
  }
  
  if (!clusters || clusters.length === 0) {
    console.log('⚠️  No clusters found. Nothing to process.');
    return;
  }
  
  console.log(`✓ Found ${clusters.length} clusters\n`);
  
  // Step 4: Verify color dictionary exists
  const { count: dictCount, error: dictError } = await supabase
    .from('color_base_names')
    .select('*', { count: 'exact', head: true });
  
  if (dictError || !dictCount || dictCount === 0) {
    throw new Error('Color dictionary (color_base_names) is empty. Run seedColorBaseName.ts first.');
  }
  
  console.log(`✓ Color dictionary contains ${dictCount} colors\n`);
  
  // Step 5: Process each cluster sequentially
  console.log('📝 Recalculating labels...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const clusterNumber = i + 1;
    
    try {
      // Optional: Skip locked clusters (uncomment to enable)
      // if (cluster.is_locked) {
      //   skippedCount++;
      //   if (clusterNumber % LOG_INTERVAL === 0) {
      //     console.log(`⏭️  Cluster ${clusterNumber}/${clusters.length}: Skipped ${cluster.id} (locked)`);
      //   }
      //   continue;
      // }
      
      // Recalculate label
      await assignClusterLabel(cluster.id);
      
      successCount++;
      
      if (clusterNumber % LOG_INTERVAL === 0) {
        console.log(
          `✓ Cluster ${clusterNumber}/${clusters.length}: ${cluster.id} ` +
          `(HEX: ${cluster.representative_hex})`
        );
      }
      
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error processing cluster ${clusterNumber}:`);
      console.error(`   ID: ${cluster.id}`);
      console.error(`   HEX: ${cluster.representative_hex}`);
      console.error(`   LAB: L=${cluster.centroid_l.toFixed(2)}, a=${cluster.centroid_a.toFixed(2)}, b=${cluster.centroid_b.toFixed(2)}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
      
      // Fail loudly - stop on first error
      throw new Error(`Recalculation failed at cluster ${clusterNumber}. Fix the error and try again.`);
    }
  }
  
  // Step 6: Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Recalculation Complete!');
  console.log('='.repeat(60));
  console.log(`Total clusters processed: ${clusters.length}`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('='.repeat(60) + '\n');
  
  // Step 7: Show sample results
  console.log('📊 Sample Results:\n');
  
  const { data: sampleClusters, error: sampleError } = await supabase
    .from('variant_color_categories')
    .select('representative_hex, label, suggested_label')
    .order('color_count', { ascending: false })
    .limit(10);
  
  if (!sampleError && sampleClusters) {
    sampleClusters.forEach((cluster, idx) => {
      console.log(
        `${idx + 1}. ${cluster.representative_hex} → ` +
        `"${cluster.label || '(no label)'}"`
      );
    });
  }
  
  console.log('');
}

// ============================================================================
// Run Script
// ============================================================================

recalculateClusterLabels()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal Error:');
    console.error(error);
    process.exit(1);
  });
