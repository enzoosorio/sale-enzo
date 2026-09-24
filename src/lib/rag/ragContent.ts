// Pure content builders shared by publishing and the reindex script.

export interface ProductItemData {
  product_item_id: string;

  // Product fields
  product_name: string;
  product_description?: string;
  enhanced_description?: string; // User-approved enhanced description (takes priority)
  enhanced_description_en?: string; // Short English semantic version
  product_brand?: string;

  // Category fields
  category_name: string;
  subcategory_name: string;

  // Variant fields
  variant_size?: string;
  variant_gender?: string;
  variant_fit?: string;
  variant_main_color_hex: string;

  // Color category
  color_category_name?: string;

  // Item fields
  item_condition?: string;
  item_price: number;
  item_stock: number;
  item_status?: string;

  // Tags (array of tag names)
  tags: string[];

  // Variant metadata (optional, for semantic enrichment)
  variant_metadata?: Record<string, string>;
}

/**
 * Build deterministic RAG content from structured fields
 * - No LLM, no creativity, just organized data
 * This is the semantic profile foundation - no LLM, pure data
 */
export function buildDeterministicRagContent(data: ProductItemData): string {
  const sections: string[] = [];

  // Product information
  sections.push(`Product name: ${data.product_name}`);

  if (data.product_brand) {
    sections.push(`Brand: ${data.product_brand}`);
  }

  sections.push(`Category: ${data.category_name}`);
  sections.push(`Subcategory: ${data.subcategory_name}`);

  // Variant attributes
  sections.push('');
  sections.push('Variant attributes:');

  if (data.variant_size) {
    sections.push(`Size: ${data.variant_size}`);
  }

  if (data.variant_gender) {
    sections.push(`Gender: ${data.variant_gender}`);
  }

  if (data.variant_fit) {
    sections.push(`Fit: ${data.variant_fit}`);
  }

  sections.push(`Main color: ${data.variant_main_color_hex}`);

  if (data.color_category_name) {
    sections.push(`Color category: ${data.color_category_name}`);
  }

  // Item attributes
  sections.push('');
  sections.push('Item attributes:');

  if (data.item_condition) {
    sections.push(`Condition: ${data.item_condition}`);
  }

  sections.push(`Price: ${data.item_price}`);


  // Tags
  if (data.tags.length > 0) {
    sections.push('');
    sections.push('Tags:');
    sections.push(data.tags.join(', '));
  }

  // Variant metadata (semantic enrichment for long-tail search)
  const metadataBlock = buildMetadataSemanticBlock(data.variant_metadata);
  if (metadataBlock) {
    sections.push('');
    sections.push('Additional attributes:');
    sections.push(metadataBlock);
  }

  // Description: Use enhanced if available, otherwise fallback to original
  // Priority: enhanced_description > product_description
  if (data.enhanced_description) {
    sections.push('');
    sections.push('Enhanced description:');
    sections.push(data.enhanced_description);

    // Include English semantic version for multilingual retrieval
    if (data.enhanced_description_en) {
      sections.push('');
      sections.push('English semantic version:');
      sections.push(data.enhanced_description_en);
    }
  } else if (data.product_description) {
    sections.push('');
    sections.push('Base description:');
    sections.push(data.product_description);
  }

  return sections.join('\n');
}

/**
 * Transform variant metadata into semantic text for embedding enrichment
 *
 * PURPOSE:
 * - Convert structured metadata into natural language signals
 * - Enrich semantic search with niche attributes
 * - Enable long-tail queries (teams, sports, materials, editions, etc.)
 *
 * RULES:
 * - Skip empty values
 * - Trim whitespace
 * - Use readable semantic patterns
 * - Limit output to ~500 chars max
 * - No translation, no normalization, no schema enforcement
 *
 * @param metadata - Key-value pairs from variant.metadata
 * @returns Semantic text block or empty string if no valid metadata
 */
export function buildMetadataSemanticBlock(metadata?: Record<string, string>): string {
  // Handle null, undefined, or empty object
  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return '';
  }

  const semanticLines: string[] = [];

  // Known metadata keys with semantic patterns
  const semanticPatterns: Record<string, string> = {
    'team': 'Associated team: {value}',
    'sport': 'Sport relevance: {value}',
    'material': 'Material: {value}',
    'edition': 'Edition: {value}',
    'season': 'Season: {value}',
    'player': 'Player: {value}',
    'event': 'Event: {value}',
    'collection': 'Collection: {value}',
    'style': 'Style: {value}',
    'feature': 'Feature: {value}',
  };

  for (const [key, value] of Object.entries(metadata)) {
    // Skip empty values
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      continue;
    }

    const trimmedKey = key?.trim().toLowerCase();
    if (!trimmedKey) {
      continue;
    }

    // Use semantic pattern if available, otherwise generic format
    const pattern = semanticPatterns[trimmedKey];
    if (pattern) {
      semanticLines.push(pattern.replace('{value}', trimmedValue));
    } else {
      // Generic fallback: capitalize first letter of key
      const capitalizedKey = trimmedKey.charAt(0).toUpperCase() + trimmedKey.slice(1);
      semanticLines.push(`${capitalizedKey}: ${trimmedValue}`);
    }
  }

  if (semanticLines.length === 0) {
    return '';
  }

  // Join with periods for natural reading, limit to ~500 chars
  let semanticBlock = semanticLines.join('. ') + '.';

  // Trim if too long (prevent embedding bloat)
  if (semanticBlock.length > 500) {
    semanticBlock = semanticBlock.substring(0, 497) + '...';
  }

  return semanticBlock;
}


/** Compact lexical document for Spanish full-text and trigram search. */
export function buildSearchText(data: ProductItemData): string {
  const values = [
    data.product_name,
    data.product_brand,
    data.category_name,
    data.subcategory_name,
    data.variant_size,
    data.variant_gender,
    data.variant_fit,
    data.color_category_name,
    ...data.tags,
    ...Object.values(data.variant_metadata ?? {}),
  ];
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
