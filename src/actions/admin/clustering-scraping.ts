'use server';

import { createClient } from "@/utils/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface ScrapingResult {
  processed: number;
  skipped: number;
  failed: number;
  errors?: Array<{ id: string; hex: string; error: string }>;
}

interface ColorCluster {
  id: string;
  representative_hex: string;
  scraped_hex_snapshot: string | null;
  scraped_label: string | null;
  is_locked: boolean;
  is_hidden: boolean;
}

interface ScrapedColorData {
  label: string;
  source: 'color-name' | 'colorkit';
}

// ============================================================================
// Main Server Action
// ============================================================================

export async function scrapeClusterLabels(
  mode: 'only-new' | 'all'
): Promise<ScrapingResult> {
  const result: ScrapingResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  try {
    const supabase = await createClient();

    // Fetch clusters based on mode
    const { data: clusters, error: fetchError } = await supabase
      .from('variant_color_categories')
      .select('id, representative_hex, scraped_hex_snapshot, scraped_label, is_locked, is_hidden');

    if (fetchError) {
      console.error('Error fetching clusters:', fetchError);
      throw new Error('Failed to fetch color clusters');
    }

    if (!clusters || clusters.length === 0) {
      return result;
    }

    // Filter clusters based on mode and rules
    const clustersToProcess = clusters.filter((cluster) => {
      // Never scrape locked clusters
      if (cluster.is_locked) {
        result.skipped++;
        return false;
      }

      // Don't modify hidden clusters unless mode is "all"
      if (cluster.is_hidden && mode !== 'all') {
        result.skipped++;
        return false;
      }

      // For "only-new" mode
      if (mode === 'only-new') {
        const isNew = !cluster.scraped_label;
        const hexChanged = cluster.representative_hex !== cluster.scraped_hex_snapshot;
        
        if (!isNew && !hexChanged) {
          result.skipped++;
          return false;
        }
      }

      return true;
    });

    console.log(`Processing ${clustersToProcess.length} clusters in mode: ${mode}`);

    // Process clusters with concurrency control
    await processWithConcurrency(
      clustersToProcess,
      async (cluster: ColorCluster) => {
        try {
          const scrapedData = await scrapeColorLabel(cluster.representative_hex);
          
          if (scrapedData) {
            // Update the database
            const { error: updateError } = await supabase
              .from('variant_color_categories')
              .update({
                scraped_label: scrapedData.label,
                scraped_hex_snapshot: cluster.representative_hex,
                label_source: scrapedData.source,
                label_scraped_at: new Date().toISOString(),
                // IMPORTANT: We do NOT update the 'label' field here
                // That remains user-editable
              })
              .eq('id', cluster.id);

            if (updateError) {
              console.error(`Error updating cluster ${cluster.id}:`, updateError);
              result.failed++;
              result.errors?.push({
                id: cluster.id,
                hex: cluster.representative_hex,
                error: updateError.message,
              });
            } else {
              result.processed++;
            }
          } else {
            result.failed++;
            result.errors?.push({
              id: cluster.id,
              hex: cluster.representative_hex,
              error: 'Failed to scrape from both sources',
            });
          }
        } catch (error) {
          console.error(`Error processing cluster ${cluster.id}:`, error);
          result.failed++;
          result.errors?.push({
            id: cluster.id,
            hex: cluster.representative_hex,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
      5, // Max 5 concurrent requests
      300 // 300ms delay between batches
    );

    return result;
  } catch (error) {
    console.error('Fatal error in scrapeClusterLabels:', error);
    throw error;
  }
}

// ============================================================================
// Scraping Logic
// ============================================================================

/**
 * Scrapes color label from primary and fallback sources
 */
async function scrapeColorLabel(hex: string): Promise<ScrapedColorData | null> {
  const cleanHex = hex.replace('#', '');

  // Try primary source first: color-name.com
  try {
    const primaryResult = await scrapeFromColorName(cleanHex);
    console.log('scraping from color name')
    if (primaryResult) {
      return { label: primaryResult, source: 'color-name' };
    }
  } catch (error) {
    console.warn(`Primary source failed for ${cleanHex}:`, error);
  }

  // Fallback to colorkit.co
  try {
    const fallbackResult = await scrapeFromColorkit(cleanHex);
    console.log('scraping from colorkit')
    if (fallbackResult) {
      return { label: fallbackResult, source: 'colorkit' };
    }
  } catch (error) {
    console.warn(`Fallback source failed for ${cleanHex}:`, error);
  }

  return null;
}

/**
 * Scrapes from color-name.com
 * Parses: <p class="hex-rgb-info"> Closest Name: Mystic Blue <br>RGB (...)
 */
async function scrapeFromColorName(hex: string): Promise<string | null> {
  const url = `https://www.color-name.com/hex/${hex}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
  console.error(`Status ${response.status} for ${url}`);
  return null;
}

    const html = await response.text();

    // Parse: Closest Name: {ColorName}
    const match = html.match(/Closest Name:\s*([^<\n]+)/i);
    if (match && match[1]) {
      const colorName = match[1].trim();
      return colorName;
    }

    return null;
  } catch (error) {
    console.error(`Error scraping color-name.com for ${hex}:`, error);
    return null;
  }
}

/**
 * Scrapes from colorkit.co
 * Parses: <div class="color-details"> <div style="..."> Rock'n'Rose </div> </div>
 */
async function scrapeFromColorkit(hex: string): Promise<string | null> {
  const url = `https://colorkit.co/color/${hex}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
if (!response.ok) {
  console.error(`Status ${response.status} for ${url}`);
  return null;
}

    const html = await response.text();

    // Parse color-details div - look for the bold color name
    const match = html.match(
      /<div class="color-details"[^>]*>[\s\S]*?<div[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>\s*([^<]+)\s*<\/div>/i
    );

    if (match && match[1]) {
      const colorName = match[1].trim();
      return colorName;
    }

    return null;
  } catch (error) {
    console.error(`Error scraping colorkit.co for ${hex}:`, error);
    return null;
  }
}

// ============================================================================
// Concurrency Control
// ============================================================================

/**
 * Processes items with controlled concurrency and batch delays
 */
async function processWithConcurrency<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number,
  batchDelay: number
): Promise<void> {
  const batches: T[][] = [];
  
  // Split into batches
  for (let i = 0; i < items.length; i += concurrency) {
    batches.push(items.slice(i, i + concurrency));
  }

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Process all items in batch concurrently
    await Promise.all(batch.map(processor));
    
    // Add delay between batches (except after the last one)
    if (i < batches.length - 1) {
      await delay(batchDelay);
    }
  }
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Label Update Server Action
// ============================================================================

/**
 * Updates the editable label for a cluster
 * This is the user-controlled label that doesn't get overwritten by scraping
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
// Accept Scraped Label Server Action
// ============================================================================

/**
 * Copies the scraped_label to the editable label field
 * This allows admins to accept the scraped suggestion
 */
export async function acceptScrapedLabel(
  clusterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    if (!clusterId) {
      return { success: false, error: 'Cluster ID is required' };
    }

    // First, fetch the cluster to get the scraped_label
    const { data: cluster, error: fetchError } = await supabase
      .from('variant_color_categories')
      .select('scraped_label')
      .eq('id', clusterId)
      .single();

    if (fetchError) {
      console.error('Error fetching cluster:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!cluster?.scraped_label) {
      return { success: false, error: 'No scraped label available' };
    }

    // Update the label with the scraped_label value
    const { error: updateError } = await supabase
      .from('variant_color_categories')
      .update({
        label: cluster.scraped_label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clusterId);

    if (updateError) {
      console.error('Error updating cluster label:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Fatal error accepting scraped label:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
