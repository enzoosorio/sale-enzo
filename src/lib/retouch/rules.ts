import type { DraftImageRow } from "@/types/staging";

/** Paid generations allowed per photo: the first, plus one retry if the owner didn't like it. */
export const MAX_IRON_GENERATIONS = 2;
/** A "pending" ironing older than this is a crashed attempt, not a running one. */
export const STALE_PENDING_MS = 5 * 60_000;

type IronCandidate = Pick<
  DraftImageRow,
  "shot_role" | "status" | "original_key" | "ironed_status" | "ironed_version" | "updated_at"
>;

/**
 * Why a photo can't be ironed right now, in words for the owner; null when it can.
 * Shared by the retouch route (the authority) and the comparator UI (the button state).
 */
export function ironBlockReason(image: IronCandidate, now = Date.now()): string | null {
  // Wear and damage are what a buyer of second-hand clothes needs to see.
  if (image.shot_role === "defect") return "Las fotos de defectos no se planchan: deben mostrar el desgaste real.";
  if (image.status !== "done" || !image.original_key) return "La foto aún no terminó de procesarse.";
  if (image.ironed_status === "pending" && now - Date.parse(image.updated_at) < STALE_PENDING_MS) {
    return "Ya se está planchando esta foto.";
  }
  if (image.ironed_version >= MAX_IRON_GENERATIONS) {
    return `Ya usaste las ${MAX_IRON_GENERATIONS} generaciones de esta foto.`;
  }
  return null;
}
