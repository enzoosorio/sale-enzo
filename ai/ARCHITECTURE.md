# System architecture

## Runtime

```
Browser: Next.js App Router client components
  ├─ URL parameters → category and product filters
  └─ SuperBarraBusqueda → POST /api/search → SearchResultsOverlay
                               │
Next.js route handler           ├─ OpenAI text-embedding-3-small
                               └─ Supabase search_products_hybrid RPC
                                      ├─ product_rag_profiles.embedding (pgvector HNSW)
                                      ├─ product_rag_profiles.fts (Spanish unaccent GIN)
                                      ├─ product_rag_profiles.search_text (trigram GIN)
                                      └─ products / variants / sellable items
```

Supabase stores the transactional catalog and embeddings. Product publication writes the relational catalog first, then calls `generateRagForProduct`; indexing errors do not block publication. `scripts/reindex-search.ts` repairs or rebuilds profiles in batches with a service-role client. The search API uses the request-scoped Supabase client and calls only the security-definer RPC, so anonymous users cannot read the profile table directly.

## Data model

`products → product_variants → product_items`. Each item has one `product_rag_profiles` row with embedding content, an OpenAI 1536-dimensional vector, compact `search_text`, and generated Spanish full-text tokens. Stock and status are excluded from embedding content; the search RPC reads live inventory before returning results.

The RPC takes query text, an optional query vector, result limit, and optional price bounds. It selects up to 50 candidates from each of vector, full-text, and trigram retrieval, fuses their ranks with reciprocal rank fusion, filters sellable items, and returns one best item per variant in the grid JSON shape plus `score`. A null vector activates text-only retrieval.

## Application flow

- `src/lib/rag/ragContent.ts` holds pure content builders for publication and reindexing.
- `src/lib/search/embedQuery.ts` normalizes and caches query embeddings in-process.
- `src/lib/search/searchProducts.ts` calls the RPC and flattens rows for `ProductCard`.
- `src/app/api/search/route.ts` validates `POST {query, limit?}` and returns `{success, data:{products,total_count,mode,took_ms}}`.
- `src/store/searchStore.ts` cancels stale client requests and owns the transient overlay state.

Product filtering remains URL-driven and separate from AI search. The results overlay is a mobile bottom sheet, opens with loading skeletons, locks body scrolling, and supports keyboard and backdrop dismissal.

## Local development

The versioned Supabase baseline is in `supabase/migrations`. This worktree uses the separate local project `sale-enzo-search` on ports 55521–55527, leaving the recovered `sale-enzo-recovery` project on 554xx available. `supabase/seed.sql` contains deterministic public demo products only. Apply it with `supabase db reset --local`, then run `npm run search:reindex`. `npm run search:eval` sends 15 unique queries through `POST /api/search` and measures precision@5 and end-to-end latency. Never run reset against the linked source project.
