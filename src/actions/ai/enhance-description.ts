"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EnhanceDescriptionInput {
  description: string;
  language?: string; // Default: "es"
}

export interface EnhanceDescriptionResult {
  success: boolean;
  enhanced_description?: string;
  enhanced_description_en?: string; // Short English semantic version
  error?: string;
}

/**
 * User-triggered description enhancement
 * 
 * This replaces the automatic server-side enhancement in RAG ingestion.
 * The user explicitly requests enhancement and can edit/approve the result.
 * 
 * Flow:
 * 1. Enhance description in original language (Spanish by default)
 * 2. Generate SHORT English semantic version for multilingual retrieval
 * 
 * CRITICAL RULES:
 * - Low temperature (deterministic)
 * - No hallucinations
 * - No attribute changes
 * - Only expand semantic richness for search
 */
export async function enhanceDescription(
  input: EnhanceDescriptionInput
): Promise<EnhanceDescriptionResult> {
  const { description, language = "es" } = input;

  // Validate input
  if (!description || description.trim() === "") {
    return {
      success: false,
      error: "La descripción no puede estar vacía",
    };
  }

  try {
    // Step 1: Enhance description in original language
    console.log("🚀 Enhancing description...");
    const enhancedResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You rewrite product descriptions for semantic search retrieval.
CRITICAL RULES:
- Do NOT invent facts or attributes
- Do NOT change size, color, price, condition, or any specific details
- Most important: Keep the exact same meaning
- Expand semantic richness without hallucination
- You can rephrase, add synonyms, and include related terms, but do NOT add new information
- You may use common search terms and phrases customers would use to find this product
- Use natural language that customers would search for
- The generated content will be in ${language.toUpperCase()}, so include ${language.toUpperCase()} synonyms and related terms where appropriate
Your goal is to make the description MORE searchable for RAG architecture implementation, not more creative for other purposes.`,
        },
        {
          role: "user",
          content: `Enhance this product description for semantic search:\n\n${description}`,
        },
      ],
    });

    const enhanced = enhancedResponse.choices[0]?.message?.content?.trim();

    if (!enhanced) {
      console.warn("LLM returned empty enhancement");
      return {
        success: false,
        error: "El modelo no pudo generar una mejora",
      };
    }

    console.log("✓ Description enhanced");

    // Step 2: Generate SHORT English semantic version for multilingual retrieval
    console.log("🌐 Generating English semantic version...");
    const translationResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 100,
      messages: [
        {
          role: "system",
          content: `You create SHORT English semantic descriptions for multilingual search.
CRITICAL RULES:
- Generate a compressed, search-friendly English version
- 1-2 sentences maximum
- Focus on key searchable terms and product essence
- Do NOT translate word-for-word
- Extract core semantic meaning for retrieval
- Use common English search terms
- This is for embedding-based search, not human reading`,
        },
        {
          role: "user",
          content: `Create a short English semantic description from this enhanced product description:\n\n${enhanced}`,
        },
      ],
    });

    const enhancedEn = translationResponse.choices[0]?.message?.content?.trim();

    if (!enhancedEn) {
      console.warn("LLM returned empty English version, skipping");
    } else {
      console.log("✓ English semantic version generated");
    }

    return {
      success: true,
      enhanced_description: enhanced,
      enhanced_description_en: enhancedEn || undefined,
    };
  } catch (error) {
    console.error("Error enhancing description:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al mejorar la descripción",
    };
  }
}
