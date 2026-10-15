/**
 * Confidence policy for AI-assisted field population (photo/vision ingestion).
 *
 * Pure and framework-free: the API route, the capture wizard and tests share
 * the same thresholds and merge rules.
 *
 * Rules:
 * - Fields the owner already typed (`fieldSource === "user"` with a non-empty
 *   value) are never touched.
 * - Empty AI values (null / undefined / [] / {}) never erase what exists.
 * - `confidence >= 0.80`                 → autofill (applied, source "ai")
 * - `0.45 <= confidence < 0.80`          → suggest  (applied, source "ai", UI warns)
 * - `confidence < 0.45` (or missing)     → dropped  (not applied)
 */

export const CONFIDENCE = { autofill: 0.8, suggest: 0.45 } as const;

/** Voice-dictated values under this confidence stay flagged "Revisar". */
export const LEGACY_UNCERTAIN_BELOW = 0.6;

export type FieldSource = "user" | "ai";

export interface ApplyAiFieldsInput<T> {
  /** Current draft state; AI values are applied on top of it. */
  current: T;
  /** Provenance of each key in `current`. */
  fieldSource: Record<string, FieldSource>;
  /** AI-extracted values (may include nulls and empties). */
  ai: Partial<T>;
  /** Model confidence per key, in 0–1. */
  confidence: Record<string, number>;
}

export interface ApplyAiFieldsResult<T> {
  /** Values safe to write (autofilled + suggested). */
  patch: Partial<T>;
  suggested: string[];
  autofilled: string[];
  dropped: string[];
  /** Provenance after this application: AI keys become "ai", the rest is preserved. */
  nextFieldSource: Record<string, FieldSource>;
}

/**
 * Voice extraction reports confidence under coarse keys ("subcategory", "price"…),
 * not DraftFields keys. This maps a draft key to the key the voice model used.
 */
export const legacyConfidenceKey = (key: string): string =>
  key === "condition_score" ? key : key.replace(/_id$/, "");

/** Same emptiness rule as the voice extraction route: null/undefined/empty array/empty object. */
const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);

export function applyAiFields<T extends Record<string, unknown>>(
  input: ApplyAiFieldsInput<T>,
): ApplyAiFieldsResult<T> {
  const patch: Partial<T> = {};
  const suggested: string[] = [];
  const autofilled: string[] = [];
  const dropped: string[] = [];
  const nextFieldSource: Record<string, FieldSource> = { ...input.fieldSource };

  for (const key of Object.keys(input.ai)) {
    const value = input.ai[key];
    if (value === undefined) continue;
    // The owner's answer wins over any AI suggestion, now and in future runs.
    if (input.fieldSource[key] === "user" && !isEmpty(input.current[key])) continue;
    // The AI has nothing useful: never erase what's already there.
    if (isEmpty(value)) continue;

    const confidence = input.confidence[key] ?? 0;
    if (confidence >= CONFIDENCE.autofill) {
      autofilled.push(key);
    } else if (confidence >= CONFIDENCE.suggest) {
      suggested.push(key);
    } else {
      dropped.push(key);
      continue;
    }

    (patch as Record<string, unknown>)[key] = value;
    nextFieldSource[key] = "ai";
  }

  return { patch, suggested, autofilled, dropped, nextFieldSource };
}
