/**
 * Product RAG Generation Pipeline
 * 
 * Generates semantic profiles for product items using:
 * 1. Deterministic content from structured fields
 * 2. User-approved enhanced description (when available)
 * 3. OpenAI embeddings (text-embedding-3-small)
 * 4. Upsert with versioning
 * 
 * This runs AFTER product creation is complete.
 * Description enhancement is USER-TRIGGERED in the UI, not automatic.
 * No LangChain, no agents, no over-abstraction.
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '@/utils/supabase/supabase-admin';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Interface for product item data needed for RAG generation
 * This matches the data structure we already have after product creation
 */
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
  sections.push(`Stock: ${data.item_stock}`);
  
  if (data.item_status) {
    sections.push(`Status: ${data.item_status}`);
  }
  
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

/**
 * @deprecated This function is no longer used in the RAG pipeline.
 * Description enhancement is now user-triggered via /actions/ai/enhance-description.ts
 * 
 * Enhance ONLY the product description using LLM
 * 
 * CRITICAL RULES:
 * - Low temperature (deterministic)
 * - No hallucinations
 * - No attribute changes
 * - Only expand semantic richness for search
 */
export async function enhanceDescriptionWithLLM(
  description: string
): Promise<string> {
  if (!description || description.trim() === '') {
    return '';
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.3, 
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You rewrite product descriptions for semantic search retrieval.
CRITICAL RULES:
- Do NOT invent facts or attributes
- Do NOT change size, color, price, condition, or any specific details
- Most important: Keep the exact same meaning
- Expand semantic richness without hallucination
- You can rephrase, add synonyms, and include related terms, but do NOT add new information
- You may use common search terms and phrases customers would use to find this product
- Use natural language that customers would search for
- The generated content will be in SPANISH, so include Spanish synonyms and related terms where appropriate
Your goal is to make the description MORE searchable for RAG architecture implementation, not more creative for other purposes.`
        },
        {
          role: 'user',
          content: `Enhance this product description for semantic search:\n\n${description}`
        }
      ]
    });
    
    const enhanced = response.choices[0]?.message?.content?.trim();
    
    if (!enhanced) {
      console.warn('LLM returned empty enhancement, using original description');
      return description;
    }
    
    return enhanced;
    
  } catch (error) {
    console.error('Error enhancing description with LLM:', error);
    // Fallback: return original description
    return description;
  }
}

/**
 * Generate OpenAI embedding for text
 * Uses text-embedding-3-small (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim() === '') {
    throw new Error('Cannot generate embedding for empty text');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    
    const embedding = response.data[0]?.embedding;
    
    if (!embedding || embedding.length === 0) {
      throw new Error('OpenAI returned empty embedding');
    }
    
    // Verify dimension count (should be 1536 for text-embedding-3-small)
    if (embedding.length !== 1536) {
      console.warn(`Expected 1536 dimensions, got ${embedding.length}`);
    }
    
    return embedding;
    
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upsert product RAG profile to database
 * 
 * UPSERT LOGIC:
 * - If exists: UPDATE content, embedding, metadata, version, updated_at
 * - If new: INSERT with version = 1
 * 
 * NOTE: embedding is passed as array (pgvector handles serialization)
 */
export async function upsertProductRagProfile(
  productItemId: string,
  content: string,
  embedding: number[],
  metadata?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!productItemId) {
      throw new Error('productItemId is required');
    }
    if (!content || content.trim() === '') {
      throw new Error('content cannot be empty');
    }
    if (!embedding || embedding.length === 0) {
      throw new Error('embedding cannot be empty');
    }

    const now = new Date().toISOString();
    const payload: any = {
      product_item_id: productItemId,
      content,
      embedding: embedding,
      version: 1,
      updated_at: now
    };

    // Include metadata if provided (for retrieval filtering/inspection)
    if (metadata && Object.keys(metadata).length > 0) {
      payload.metadata = metadata;
    }

    const { data, error } = await supabaseAdmin
      .from('product_rag_profiles')
      .upsert(payload, { onConflict: 'product_item_id' })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`✓ Upserted RAG profile for item ${productItemId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Unexpected error in upsertProductRagProfile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main orchestrator: Generate complete RAG profile for a product item
 * 
 * This function is called at the END of product creation.
 * It receives the complete data structure we already have.
 * 
 * Flow:
 * 1. Build deterministic content from structured fields
 * 2. Use enhanced_description if available (user-approved), otherwise product_description
 * 3. Generate embedding from final content
 * 4. Upsert to database
 * 
 * NOTE: Description enhancement is now USER-TRIGGERED in the UI, not automatic.
 */
export async function generateProductRAG(
  data: ProductItemData
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚀 Starting RAG generation for product_item ${data.product_item_id}...`);
    
    // Step 1: Build complete RAG content (includes enhanced description if available)
    const finalContent = buildDeterministicRagContent(data);
    console.log('✓ Built deterministic content');
    
    // Log which description is being used
    if (data.enhanced_description) {
      console.log('✓ Using user-approved enhanced description');
      if (data.enhanced_description_en) {
        console.log('✓ Including English semantic version for multilingual retrieval');
      }
    } else if (data.product_description) {
      console.log('ℹ Using original product description');
    } else {
      console.log('⚠ No description available');
    }
    
    // Step 2: Generate embedding
    console.log('🔮 Generating OpenAI embedding...');
    const embedding = await generateEmbedding(finalContent);
    console.log(`✓ Generated embedding (${embedding.length} dimensions)`);
    
    // Step 3: Upsert to database
    console.log('💾 Upserting to product_rag_profiles...');
    const result = await upsertProductRagProfile(
      data.product_item_id,
      finalContent,
      embedding,
      data.variant_metadata // Pass metadata for storage (enables filtering/inspection)
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    console.log(`✅ RAG generation complete for product_item ${data.product_item_id}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error in generateProductRAG:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
