import type { CutoutVerdict } from "./imageOps";

/**
 * Did the ironing keep the garment the same garment? A generative retouch can
 * quietly redraw a print or reshape the piece; this catches the gross cases by
 * comparing the ironed cutout with the plain one:
 *   - aspect ratio of the cropped garment (a changed silhouette)
 *   - dominant colors (a changed print or color)
 * It is a tripwire, not a proof: the owner still compares before accepting.
 */

export interface IronCheckInput {
  width: number;
  height: number;
  /** Hex colors ordered by share (from dominantColors). */
  colors: string[];
}

export type IronCheckReason = "aspect" | "palette" | "cutout";

export interface IronCheck {
  verdict: CutoutVerdict;
  reasons: IronCheckReason[];
  /** Relative change of width/height, 0-1. */
  aspectChange: number;
  /** Worst nearest-color distance among the ironed palette, 0-1 (RGB, normalized). */
  paletteShift: number;
}

export const IRON_LIMITS = {
  aspectSuspect: 0.08,
  aspectFailed: 0.2,
  paletteSuspect: 0.12,
  paletteFailed: 0.22,
} as const;

const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 * 255);

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const distance = (a: string, b: string) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) / MAX_RGB_DISTANCE;
};

export function compareIroned(
  original: IronCheckInput,
  ironed: IronCheckInput,
  /** Verdict of the quality gate on the ironed cutout itself (the same gate every photo goes through). */
  cutoutVerdict: CutoutVerdict = "ok",
): IronCheck {
  const before = original.width / original.height;
  const after = ironed.width / ironed.height;
  const aspectChange = Math.abs(after - before) / before;

  // Every main color of the ironed garment should still exist in the original one.
  const paletteShift =
    original.colors.length && ironed.colors.length
      ? Math.max(...ironed.colors.slice(0, 3).map((c) => Math.min(...original.colors.map((o) => distance(c, o)))))
      : 0;

  const reasons: IronCheckReason[] = [];
  let verdict: CutoutVerdict = "ok";
  const flag = (level: CutoutVerdict, reason: IronCheckReason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
    if (level === "failed" || verdict === "ok") verdict = level;
  };

  if (aspectChange > IRON_LIMITS.aspectFailed) flag("failed", "aspect");
  else if (aspectChange > IRON_LIMITS.aspectSuspect) flag("suspect", "aspect");
  if (paletteShift > IRON_LIMITS.paletteFailed) flag("failed", "palette");
  else if (paletteShift > IRON_LIMITS.paletteSuspect) flag("suspect", "palette");
  if (cutoutVerdict !== "ok") flag(cutoutVerdict, "cutout");

  return { verdict, reasons, aspectChange, paletteShift };
}
