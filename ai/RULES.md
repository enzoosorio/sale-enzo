# Development rules

## Architecture

- Supabase PostgreSQL owns products, variants, sellable items, users, orders, and product-item embeddings in `product_rag_profiles`.
- Next.js reads and writes transactional data through Supabase SDK. Search calls the `search_products_hybrid` RPC through `POST /api/search`.
- One embedding exists per `product_item`. It is built from product, variant, item, tags, and metadata with OpenAI `text-embedding-3-small` (1536 dimensions).
- Never expose `OPENAI_API_KEY` or the Supabase service key to browser code. The reindex script and admin publishing alone may use the service key.
- Keep public filtering in URL parameters. Search results live in a dismissible overlay and never change those parameters.

## Performance and interaction

- Use Server Components by default. Use client components for the search input, overlay, and other interactions.
- Use GSAP for motion. Animate transforms and opacity, clean up React animation contexts, respect reduced motion, and measure 60 fps on mobile.
- Show loading skeletons while search runs. Do not wait for data before opening the overlay.
- Batch product embeddings, skip unchanged profiles, and cache query embeddings. A failed query embedding falls back to full-text and trigram retrieval.
- Search targets: precision@5 at least 80% on the local seed evaluation, and p50 end-to-end response below 500 ms including OpenAI for new queries.

## Data and code quality

- Preserve `products → product_variants → product_items` and the existing grid sellability rule: active product, positive stock, and available or reserved item.
- Add schema changes only through versioned Supabase migrations. Run `db reset --local` before applying migrations elsewhere. Never reset the linked source project.
- Keep TypeScript strict. Validate public request bodies with Zod. Avoid `any`; narrow `unknown` at boundaries.
- Keep Zustand for search UI state, request cancellation, and transient overlay results. Do not copy the URL filter state into the store.
- Use `next/image` with responsive sizes for product media. Keep remote image hosts in `next.config.ts`.
- Run Vitest, typecheck, local SQL checks, and browser interaction checks for search changes.

## Search overlay pattern

```
Input → 300 ms debounce or Enter → POST /api/search
  → cached/new OpenAI query embedding
  → search_products_hybrid RPC (vector + FTS + trigram, RRF)
  → product / variant / item rows → ProductCard overlay
```

The request uses `AbortController`; a new query or close cancels the previous one. Escape, backdrop, and close button dismiss the overlay. The overlay owns body scroll lock. The API returns `{success, data:{products,total_count,mode,took_ms}}`.
