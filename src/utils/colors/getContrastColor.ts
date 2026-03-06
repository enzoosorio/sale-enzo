function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");

  const bigint = parseInt(sanitized, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

function srgbToLinear(c: number) {
  const channel = c / 255;

  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function getLuminance(r: number, g: number, b: number) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  const luminance = getLuminance(r, g, b);

  return luminance > 0.5 ? "black" : "white";
}