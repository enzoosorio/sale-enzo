import "server-only";
import { openai } from "@/lib/openai";

const MAX_ENTRIES = 500;
const cache = new Map<string, Promise<number[]>>();

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export async function embedQuery(query: string): Promise<number[]> {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) throw new Error("Search query cannot be empty");

  const cached = cache.get(normalized);
  if (cached) {
    cache.delete(normalized);
    cache.set(normalized, cached);
    return cached;
  }

  const pending = openai().embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: normalized,
    encoding_format: "float",
  }).then((response) => {
    const embedding = response.data[0]?.embedding;
    if (!embedding || embedding.length !== 1536) throw new Error("Invalid query embedding");
    return embedding;
  }).catch((error: unknown) => {
    cache.delete(normalized);
    throw error;
  });

  cache.set(normalized, pending);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return pending;
}

export function clearQueryEmbeddingCache(): void {
  cache.clear();
}
