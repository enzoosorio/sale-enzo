import type { DraftUpdate } from "@/actions/admin/staging";
import type { FieldTone } from "@/components/admin/staging/fields";
import type { CatalogProduct, TaxonomyNode } from "@/lib/catalog/extract";
import type { DraftFields } from "@/lib/catalog/schema";
import type { DraftWithImages } from "@/types/staging";

/** Catalog data the Producto step needs (taxonomy, brands, siblings). Loaded in parallel with the first paint. */
export interface CaptureContext {
  taxonomy: TaxonomyNode[];
  brands: string[];
  catalog: CatalogProduct[];
}

/** What every wizard step receives from CaptureWizard. */
export interface StepProps {
  draft: DraftWithImages;
  /** published / discarded drafts are read-only */
  locked: boolean;
  /** "missing" is only reported once the user has passed the step; "uncertain" comes from the AI */
  tone: (key: string) => FieldTone;
  save: (patch: DraftUpdate) => void;
  set: <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => void;
  /** Resolves the draft id, creating the draft first if nothing exists yet */
  ensureDraft: () => Promise<string>;
}
