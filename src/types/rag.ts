/**
 * Type Definitions for RAG System
 * 
 * All TypeScript types and interfaces used across the RAG architecture.
 * These types ensure type safety and clear contracts between modules.
 */

/**
 * Represents a raw document before processing
 */
export interface RawDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  createdAt: Date;
}

/**
 * Metadata associated with a document
 */
export interface DocumentMetadata {
  source: string; // File path or URL
  title?: string;
  author?: string;
  category?: string; // e.g., "faq", "guide", "help"
  tags?: string[];
  language?: string;
  [key: string]: any; // Allow custom metadata
}

/**
 * A text chunk created from document splitting
 */
export interface TextChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  chunkIndex: number;
}

/**
 * Metadata for a text chunk
 */
export interface ChunkMetadata extends DocumentMetadata {
  chunkIndex: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

/**
 * Vector search result from Turso
 */
export interface SearchResult {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  score: number; // Similarity score
}

/**
 * RAG query input
 */
export interface RagQuery {
  question: string;
  filters?: Record<string, any>; // Metadata filters
  topK?: number;
  threshold?: number;
}

/**
 * RAG response output
 */
export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  tokensUsed?: number;
  processingTimeMs: number;
}

/**
 * Document ingestion result
 */
export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  vectorsStored: number;
  success: boolean;
  error?: string;
}

/**
 * Embedding provider types
 */
export type EmbeddingProvider = "ollama" | "openai";

/**
 * LLM provider types
 */
export type LLMProvider = "ollama" | "openai";

/**
 * Supported document types for ingestion
 */
export type SupportedDocumentType = "txt" | "md" | "pdf";

/**
 * Chunking strategy configuration
 */
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

/**
 * Database row for documents table
 */
export interface DocumentRow {
  id: string;
  content: string;
  metadata: string; // JSON string
  created_at: string;
}

/**
 * Database row for chunks table with embeddings
 */
export interface ChunkRow {
  id: string;
  document_id: string;
  content: string;
  embedding: string; // JSON array as string
  metadata: string; // JSON string
  chunk_index: number;
  created_at: string;
}

/**
 * Prompt template for RAG
 */
export interface PromptTemplate {
  system: string;
  context: string;
  question: string;
}
