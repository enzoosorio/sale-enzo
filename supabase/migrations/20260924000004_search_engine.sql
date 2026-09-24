-- Hybrid product search. The recovered baseline already owns vector(1536)
-- and idx_product_rag_profiles_embedding_hnsw.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create text search configuration public.spanish_unaccent (copy = pg_catalog.spanish);
alter text search configuration public.spanish_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, spanish_stem;

alter table public.product_rag_profiles
  add column search_text text not null default '';

alter table public.product_rag_profiles
  add column fts tsvector generated always as
    (to_tsvector('public.spanish_unaccent'::regconfig, coalesce(search_text, ''))) stored;

create index idx_product_rag_profiles_fts
  on public.product_rag_profiles using gin (fts);
create index idx_product_rag_profiles_search_trgm
  on public.product_rag_profiles using gin (search_text extensions.gin_trgm_ops);

create or replace function public.search_products_hybrid(
  p_query text,
  p_query_embedding extensions.vector(1536) default null,
  p_match_count integer default 24,
  p_min_price numeric default null,
  p_max_price numeric default null
) returns jsonb
language sql stable security definer
set search_path = public, extensions
as $$
with args as (
  select left(trim(coalesce(p_query, '')), 120) as query,
         least(greatest(coalesce(p_match_count, 24), 1), 48) as page_size
),
semantic_nearest as (
  select r.product_item_id, r.embedding <=> p_query_embedding as distance
  from public.product_rag_profiles r
  where p_query_embedding is not null and r.embedding is not null
  order by r.embedding <=> p_query_embedding
  limit 50
),
semantic as (
  select product_item_id,
         row_number() over (order by distance, product_item_id) as rank
  from semantic_nearest
),
text_nearest as (
  select r.product_item_id,
         ts_rank_cd(r.fts, websearch_to_tsquery('public.spanish_unaccent'::regconfig, a.query)) as relevance
  from public.product_rag_profiles r cross join args a
  where a.query <> ''
    and r.fts @@ websearch_to_tsquery('public.spanish_unaccent'::regconfig, a.query)
  order by relevance desc, r.product_item_id
  limit 50
),
full_text as (
  select product_item_id,
         row_number() over (order by relevance desc, product_item_id) as rank
  from text_nearest
),
trigram_nearest as (
  select r.product_item_id,
         extensions.word_similarity(extensions.unaccent(lower(a.query)), r.search_text) as relevance
  from public.product_rag_profiles r cross join args a
  where a.query <> ''
    and extensions.unaccent(lower(a.query)) <% r.search_text
  order by relevance desc, r.product_item_id
  limit 50
),
trigram as (
  select product_item_id,
         row_number() over (order by relevance desc, product_item_id) as rank
  from trigram_nearest
),
fused as (
  select product_item_id, sum(weight / (50.0 + rank)) as score
  from (
    select product_item_id, rank, 2.0 as weight from semantic
    union all
    select product_item_id, rank, 1.5 as weight from full_text
    union all
    select product_item_id, rank, 1.0 as weight from trigram
  ) candidates
  group by product_item_id
),
sellable as (
  select p, v, i, f.score,
         row_number() over (
           partition by v.id
           order by f.score desc, i.price asc, i.id
         ) as variant_rank
  from fused f
  join public.product_items i on i.id = f.product_item_id
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id
  where p.is_active is true
    and coalesce(i.stock, 0) > 0
    and coalesce(i.status, 'available') in ('available', 'reserved')
    and (p_min_price is null or i.price >= p_min_price)
    and (p_max_price is null or i.price <= p_max_price)
),
deduplicated as (
  select p, v, i, score from sellable where variant_rank = 1
),
paged as (
  select * from deduplicated
  order by score desc, (i).price asc, (v).id
  limit (select page_size from args)
)
select jsonb_build_object(
  'products',
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'product', jsonb_build_object(
          'id', (p).id, 'name', (p).name, 'description', (p).description,
          'brand', coalesce((p).brand, ''), 'category_id',
          (select c.parent_id from public.product_categories c where c.id = (p).subcategory_id),
          'is_active', (p).is_active, 'created_at', (p).created_at,
          'updated_at', (p).updated_at
        ),
        'variant', jsonb_build_object(
          'id', (v).id, 'product_id', (v).product_id, 'size', (v).size,
          'main_color_hex', (v).main_color_hex, 'main_color_category_id',
          (v).main_color_category_id, 'main_img_url', (v).main_img_url,
          'gender', (v).gender, 'fit', (v).fit, 'metadata', (v).metadata,
          'created_at', (v).created_at
        ),
        'item', to_jsonb(i),
        'score', score
      )
      order by score desc, (i).price asc, (v).id
    ) from paged
  ), '[]'::jsonb),
  'total_count', (select count(*) from deduplicated)
);
$$;

revoke all on function public.search_products_hybrid(text, extensions.vector, integer, numeric, numeric) from public;
grant execute on function public.search_products_hybrid(text, extensions.vector, integer, numeric, numeric)
  to anon, authenticated;
