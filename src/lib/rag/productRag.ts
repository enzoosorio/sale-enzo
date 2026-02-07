/**
 * Product RAG Generation Pipeline
 * 
 * Generates semantic profiles for product items using:
 * 1. Deterministic content from structured fields
 * 2. LLM-enhanced description (ONLY)
 * 3. OpenAI embeddings (text-embedding-3-small)
 * 4. Upsert with versioning
 * 
 * This runs AFTER product creation is complete.
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
}

/**
 * Build deterministic RAG content from structured fields
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
  
  // Base description (will be enhanced later)
  if (data.product_description) {
    sections.push('');
    sections.push('Base description:');
    sections.push(data.product_description);
  }
  
  return sections.join('\n');
}

/**
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
      temperature: 0.2, // Low temperature for consistency
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You rewrite product descriptions for semantic search retrieval.

CRITICAL RULES:
- Do NOT invent facts or attributes
- Do NOT change size, color, price, condition, or any specific details
- Keep the exact same meaning
- Add alternative phrasing useful for search queries
- Expand semantic richness without hallucination
- Use natural language that customers would search for

Your goal is to make the description MORE searchable, not more creative.`
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
 * - If exists: UPDATE content, embedding, version, updated_at
 * - If new: INSERT with version = 1
 */
export async function upsertProductRagProfile(
  productItemId: string,
  content: string,
  embedding: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if profile exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('product_rag_profiles')
      .select('product_item_id, version')
      .eq('product_item_id', productItemId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (OK)
      console.error('Error checking existing RAG profile:', checkError);
      return { success: false, error: checkError.message };
    }
    
    if (existing) {
      // UPDATE existing profile
      const { error: updateError } = await supabaseAdmin
        .from('product_rag_profiles')
        .update({
          content,
          embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
          version: existing.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('product_item_id', productItemId);
      
      if (updateError) {
        console.error('Error updating RAG profile:', updateError);
        return { success: false, error: updateError.message };
      }
      
      console.log(`✅ Updated RAG profile for product_item ${productItemId} (version ${existing.version + 1})`);
      
    } else {
      // INSERT new profile
      const { error: insertError } = await supabaseAdmin
        .from('product_rag_profiles')
        .insert({
          product_item_id: productItemId,
          content,
          embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
          version: 1
        });
      
      if (insertError) {
        console.error('Error inserting RAG profile:', insertError);
        return { success: false, error: insertError.message };
      }
      
      console.log(`✅ Created RAG profile for product_item ${productItemId} (version 1)`);
    }
    
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
 * 2. Enhance ONLY the description with LLM
 * 3. Merge enhanced description back into content
 * 4. Generate embedding
 * 5. Upsert to database
 */
export async function generateProductRAG(
  data: ProductItemData
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚀 Starting RAG generation for product_item ${data.product_item_id}...`);
    
    // Step 1: Build deterministic content
    const baseContent = buildDeterministicRagContent(data);
    console.log('✓ Built deterministic content');
    
    // Step 2: Enhance description with LLM (if exists)
    let finalContent = baseContent;
    
    if (data.product_description) {
      console.log('⚡ Enhancing description with LLM...');
      const enhancedDescription = await enhanceDescriptionWithLLM(
        data.product_description
      );
      
      // Replace the "Base description:" section with "Enhanced description:"
      finalContent = baseContent.replace(
        `Base description:\n${data.product_description}`,
        `Enhanced description:\n${enhancedDescription}`
      );
      
      console.log('✓ Description enhanced');
    }
    
    // Step 3: Generate embedding
    console.log('🔮 Generating OpenAI embedding...');
    const embedding = await generateEmbedding(finalContent);
    console.log(`✓ Generated embedding (${embedding.length} dimensions)`);
    
    // Step 4: Upsert to database
    console.log('💾 Upserting to product_rag_profiles...');
    const result = await upsertProductRagProfile(
      data.product_item_id,
      finalContent,
      embedding
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
