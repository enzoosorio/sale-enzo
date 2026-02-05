/**
 * Color Clustering Test Utilities
 * 
 * Use these functions to test and validate the color clustering system.
 * Run from a server action or API route.
 */

import { hexToLab, labToHex } from './labConversion';
import { deltaE2000, deltaE76 } from './deltaE';
import { getOrCreateColorCluster, getAllColorClusters } from './clustering';

/**
 * Test color space conversion accuracy
 */
export function testColorConversion() {
  const testColors = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFFFF", // White
    "#000000", // Black
    "#FF5733", // Orange-Red
    "#3498DB", // Blue
    "#2ECC71", // Green
  ];

  console.log("=== Color Conversion Test ===");
  
  for (const hex of testColors) {
    const lab = hexToLab(hex);
    const backToHex = labToHex(lab);
    
    console.log({
      original: hex,
      lab: {
        l: lab.l.toFixed(2),
        a: lab.a.toFixed(2),
        b: lab.b.toFixed(2)
      },
      converted: backToHex,
      match: hex.toUpperCase() === backToHex.toUpperCase()
    });
  }
}

/**
 * Test deltaE distance calculations
 */
export function testDeltaE() {
  console.log("=== DeltaE Distance Test ===");
  
  const testPairs = [
    { hex1: "#FF0000", hex2: "#FF0000", expected: "identical" },
    { hex1: "#FF0000", hex2: "#FF0101", expected: "barely perceptible" },
    { hex1: "#FF0000", hex2: "#FF5733", expected: "moderate" },
    { hex1: "#FF0000", hex2: "#0000FF", expected: "completely different" },
  ];

  for (const { hex1, hex2, expected } of testPairs) {
    const lab1 = hexToLab(hex1);
    const lab2 = hexToLab(hex2);
    
    const de2000 = deltaE2000(lab1, lab2);
    const de76 = deltaE76(lab1, lab2);
    
    console.log({
      color1: hex1,
      color2: hex2,
      expected,
      deltaE2000: de2000.toFixed(2),
      deltaE76: de76.toFixed(2)
    });
  }
}

/**
 * Test clustering with sample colors
 * NOTE: This will create clusters in the database!
 */
export async function testClustering() {
  console.log("=== Clustering Test ===");
  console.warn("⚠️ This will create clusters in the database!");

  const testColors = [
    "#FF0000", // Red
    "#FF1111", // Slightly different red
    "#FF5733", // Orange-red
    "#0000FF", // Blue (should create new cluster)
    "#0011FF", // Slightly different blue
  ];

  for (const hex of testColors) {
    try {
      const result = await getOrCreateColorCluster(hex);
      
      console.log({
        input: hex,
        cluster_id: result.color_category_id,
        is_new: result.is_new_cluster,
        lab: {
          l: result.l.toFixed(2),
          a: result.a.toFixed(2),
          b: result.b.toFixed(2)
        }
      });
    } catch (error: any) {
      console.error(`Failed to cluster ${hex}:`, error.message);
    }
  }
}

/**
 * View current cluster state
 */
export async function viewClusters() {
  console.log("=== Current Clusters ===");
  
  try {
    const clusters = await getAllColorClusters();
    
    console.log(`Total clusters: ${clusters.length}`);
    console.log("");
    
    for (const cluster of clusters) {
      console.log({
        id: cluster.id,
        hex: cluster.representative_hex,
        count: cluster.color_count,
        label: cluster.label || "unlabeled",
        lab: {
          l: cluster.centroid_l.toFixed(2),
          a: cluster.centroid_a.toFixed(2),
          b: cluster.centroid_b.toFixed(2)
        },
        locked: cluster.is_locked,
        hidden: cluster.is_hidden
      });
    }
  } catch (error: any) {
    console.error("Failed to fetch clusters:", error.message);
  }
}

/**
 * Calculate color similarity between two HEX colors
 */
export function getColorSimilarity(hex1: string, hex2: string) {
  const lab1 = hexToLab(hex1);
  const lab2 = hexToLab(hex2);
  const distance = deltaE2000(lab1, lab2);
  
  let similarity: string;
  if (distance < 1) similarity = "identical";
  else if (distance < 5) similarity = "very similar";
  else if (distance < 15) similarity = "similar";
  else if (distance < 30) similarity = "different";
  else similarity = "very different";
  
  return {
    color1: hex1,
    color2: hex2,
    deltaE: distance.toFixed(2),
    similarity
  };
}
