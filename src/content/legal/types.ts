/** A block of an informational page: a heading followed by paragraphs, a list, or both. */
export interface LegalSection {
  heading: string;
  paragraphs?: readonly string[];
  list?: readonly string[];
}

/**
 * Editable content for a legal or informational page.
 * Text wrapped in {{DOUBLE_BRACES}} is a placeholder that still needs a real fact.
 */
export interface LegalContent {
  /** Page h1 and metadata title (the root layout appends " | Sale Enzo"). */
  title: string;
  /** Short summary used as the metadata description. */
  description: string;
  /** ISO date (YYYY-MM-DD) shown as "Última actualización". */
  updatedAt: string;
  /** Optional lead paragraph shown under the title. */
  intro?: string;
  sections: readonly LegalSection[];
}
