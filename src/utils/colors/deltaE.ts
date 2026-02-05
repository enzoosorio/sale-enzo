/**
 * CIEDE2000 Color Difference Formula
 * 
 * This is the industry-standard perceptual color difference metric.
 * It accounts for non-uniformities in human color perception that simpler
 * formulas like deltaE76 or deltaE94 don't capture.
 * 
 * Returns a deltaE value where:
 * - 0: identical colors
 * - 1: barely perceptible difference (JND - Just Noticeable Difference)
 * - 2-10: perceptible at a glance
 * - 10-50: significant difference
 * - 50+: completely different colors
 * 
 * Reference: Sharma, G., Wu, W., & Dalal, E. N. (2005).
 * "The CIEDE2000 color-difference formula"
 */

import { LAB } from './labConversion';

/**
 * Calculate CIEDE2000 color difference between two LAB colors
 * @param lab1 - First LAB color
 * @param lab2 - Second LAB color
 * @param kL - Lightness weight (default: 1)
 * @param kC - Chroma weight (default: 1)
 * @param kH - Hue weight (default: 1)
 * @returns deltaE2000 value (0 = identical, higher = more different)
 */
export function deltaE2000(
  lab1: LAB,
  lab2: LAB,
  kL: number = 1,
  kC: number = 1,
  kH: number = 1
): number {
  const { l: L1, a: a1, b: b1 } = lab1;
  const { l: L2, a: a2, b: b2 } = lab2;

  // Step 1: Calculate C1, C2, and C̄ (C-bar)
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  // Step 2: Calculate G
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));

  // Step 3: Calculate a'1, a'2
  const a1_prime = (1 + G) * a1;
  const a2_prime = (1 + G) * a2;

  // Step 4: Calculate C'1, C'2
  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

  // Step 5: Calculate h'1, h'2
  const h1_prime = computeHPrime(b1, a1_prime);
  const h2_prime = computeHPrime(b2, a2_prime);

  // Step 6: Calculate ΔL', ΔC', ΔH'
  const deltaL_prime = L2 - L1;
  const deltaC_prime = C2_prime - C1_prime;
  const deltah_prime = computeDeltaHPrime(C1_prime, C2_prime, h1_prime, h2_prime);
  const deltaH_prime = 2 * Math.sqrt(C1_prime * C2_prime) * Math.sin(degreesToRadians(deltah_prime / 2));

  // Step 7: Calculate L̄', C̄', H̄'
  const Lbar_prime = (L1 + L2) / 2;
  const Cbar_prime = (C1_prime + C2_prime) / 2;
  const Hbar_prime = computeHBarPrime(h1_prime, h2_prime, C1_prime, C2_prime);

  // Step 8: Calculate T
  const T = 1
    - 0.17 * Math.cos(degreesToRadians(Hbar_prime - 30))
    + 0.24 * Math.cos(degreesToRadians(2 * Hbar_prime))
    + 0.32 * Math.cos(degreesToRadians(3 * Hbar_prime + 6))
    - 0.20 * Math.cos(degreesToRadians(4 * Hbar_prime - 63));

  // Step 9: Calculate SL, SC, SH
  const SL = 1 + ((0.015 * Math.pow(Lbar_prime - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar_prime - 50, 2)));
  const SC = 1 + 0.045 * Cbar_prime;
  const SH = 1 + 0.015 * Cbar_prime * T;

  // Step 10: Calculate RT
  const deltaTheta = 30 * Math.exp(-Math.pow((Hbar_prime - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cbar_prime, 7) / (Math.pow(Cbar_prime, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(degreesToRadians(2 * deltaTheta)) * RC;

  // Step 11: Calculate final deltaE2000
  const deltaE = Math.sqrt(
    Math.pow(deltaL_prime / (kL * SL), 2) +
    Math.pow(deltaC_prime / (kC * SC), 2) +
    Math.pow(deltaH_prime / (kH * SH), 2) +
    RT * (deltaC_prime / (kC * SC)) * (deltaH_prime / (kH * SH))
  );

  return deltaE;
}

/**
 * Compute h' (hue angle in degrees)
 */
function computeHPrime(b: number, a_prime: number): number {
  if (b === 0 && a_prime === 0) {
    return 0;
  }
  
  const hue = radiansToDegrees(Math.atan2(b, a_prime));
  return hue >= 0 ? hue : hue + 360;
}

/**
 * Compute Δh' (hue difference)
 */
function computeDeltaHPrime(C1_prime: number, C2_prime: number, h1_prime: number, h2_prime: number): number {
  if (C1_prime === 0 || C2_prime === 0) {
    return 0;
  }
  
  const diff = h2_prime - h1_prime;
  
  if (Math.abs(diff) <= 180) {
    return diff;
  } else if (diff > 180) {
    return diff - 360;
  } else {
    return diff + 360;
  }
}

/**
 * Compute H̄' (mean hue angle)
 */
function computeHBarPrime(h1_prime: number, h2_prime: number, C1_prime: number, C2_prime: number): number {
  if (C1_prime === 0 || C2_prime === 0) {
    return h1_prime + h2_prime;
  }
  
  const diff = Math.abs(h1_prime - h2_prime);
  const sum = h1_prime + h2_prime;
  
  if (diff <= 180) {
    return sum / 2;
  } else if (sum < 360) {
    return (sum + 360) / 2;
  } else {
    return (sum - 360) / 2;
  }
}

/**
 * Convert degrees to radians
 */
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Simple deltaE76 (Euclidean distance in LAB space)
 * Faster but less perceptually accurate than deltaE2000
 * Use for quick filtering before applying deltaE2000
 */
export function deltaE76(lab1: LAB, lab2: LAB): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  
  return Math.sqrt(dL * dL + da * da + db * db);
}
