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

import { openai } from "@/lib/openai";
import { supabaseAdmin } from '@/utils/supabase/supabase-admin';

import { buildDeterministicRagContent, buildSearchText, type ProductItemData } from "./ragContent";
export { buildDeterministicRagContent, buildMetadataSemanticBlock, buildSearchText } from "./ragContent";
export type { ProductItemData } from "./ragContent";

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
    const response = await openai().chat.completions.create({
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
    const response = await openai().embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });
    
    const embedding = response.data[0]?.embedding;
    
    if (!embedding || embedding.length === 0) {
      throw new Error('OpenAI returned empty embedding');
    }
    
    // Verify dimension count (should be 1536 for text-embedding-3-small)
    if (embedding.length !== 1536) throw new Error(`Expected 1536 dimensions, got ${embedding.length}`);
    
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
  searchText: string,
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
    const payload = {
      product_item_id: productItemId,
      content,
      search_text: searchText,
      embedding: embedding,
      version: 1,
      updated_at: now,
      metadata: metadata ?? null,
    };

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
      buildSearchText(data),
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
