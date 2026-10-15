import type { AiFieldProps } from "@/components/admin/staging/fields";
import type { DraftFields } from "@/lib/catalog/schema";
import type { DraftWithImages } from "@/types/staging";

type Setter = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => void;

/**
 * AI provenance props for one draft field. Confirming re-saves the current
 * value: `updateDraft` marks any saved key as owner-sourced, which clears the
 * "Sugerido" state without the owner having to retype anything.
 */
export function aiFieldProps(draft: DraftWithImages, key: keyof DraftFields & string, set: Setter): AiFieldProps {
  const source = draft.field_source[key];
  return {
    source,
    confidence: draft.field_confidence[key],
    onConfirm: source === "ai" ? () => set(key, draft[key]) : undefined,
  };
}
