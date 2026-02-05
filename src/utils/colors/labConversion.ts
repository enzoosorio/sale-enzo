/**
 * Color space conversion utilities
 * HEX → RGB → XYZ → LAB
 * LAB → XYZ → RGB → HEX
 * 
 * Uses D65 illuminant and 2° observer (sRGB standard)
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

/**
 * Convert HEX color to LAB color space
 * @param hex - Hex color string (e.g., "#FF5733" or "FF5733")
 * @returns LAB color object with l, a, b values
 */
export function hexToLab(hex: string): LAB {
  const rgb = hexToRgb(hex);
  const xyz = rgbToXyz(rgb);
  const lab = xyzToLab(xyz);
  return lab;
}

/**
 * Convert LAB color to HEX
 * @param lab - LAB color object
 * @returns HEX color string (e.g., "#FF5733")
 */
export function labToHex(lab: LAB): string {
  const xyz = labToXyz(lab);
  const rgb = xyzToRgb(xyz);
  return rgbToHex(rgb);
}

/**
 * Parse HEX string to RGB object
 */
function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Parse hex values
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return { r, g, b };
}

/**
 * Convert RGB to HEX string
 */
function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Convert RGB to XYZ color space
 * Assumes sRGB color space
 */
function rgbToXyz(rgb: RGB): XYZ {
  // Normalize RGB values to 0-1
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;
  
  // Apply sRGB gamma correction (inverse companding)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  // Convert to XYZ using sRGB matrix
  // Observer = 2°, Illuminant = D65
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  
  return { 
    x: x * 100, // Scale to 0-100
    y: y * 100, 
    z: z * 100 
  };
}

/**
 * Convert XYZ to RGB color space
 */
function xyzToRgb(xyz: XYZ): RGB {
  // Scale from 0-100 to 0-1
  const x = xyz.x / 100;
  const y = xyz.y / 100;
  const z = xyz.z / 100;
  
  // Convert XYZ to linear RGB using inverse sRGB matrix
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  
  // Apply sRGB gamma correction (companding)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : r * 12.92;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : g * 12.92;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : b * 12.92;
  
  // Scale to 0-255
  return {
    r: r * 255,
    g: g * 255,
    b: b * 255
  };
}

/**
 * Convert XYZ to LAB color space
 * Reference white point: D65 (daylight)
 */
function xyzToLab(xyz: XYZ): LAB {
  // D65 reference white point
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;
  
  // Normalize by reference white
  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;
  
  // Apply LAB transformation function
  const f = (t: number) => {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3)
      ? Math.pow(t, 1 / 3)
      : (t / (3 * delta * delta)) + (4 / 29);
  };
  
  x = f(x);
  y = f(y);
  z = f(z);
  
  // Calculate LAB values
  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  
  return { l, a, b };
}

/**
 * Convert LAB to XYZ color space
 */
function labToXyz(lab: LAB): XYZ {
  // D65 reference white point
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;
  
  // Calculate intermediate values
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  
  // Inverse LAB transformation function
  const finv = (t: number) => {
    const delta = 6 / 29;
    return t > delta
      ? Math.pow(t, 3)
      : 3 * delta * delta * (t - 4 / 29);
  };
  
  const x = refX * finv(fx);
  const y = refY * finv(fy);
  const z = refZ * finv(fz);
  
  return { x, y, z };
}

/**
 * Validate HEX color format
 */
export function isValidHex(hex: string): boolean {
  const cleanHex = hex.replace(/^#/, '');
  return /^[0-9A-Fa-f]{6}$/.test(cleanHex);
}
