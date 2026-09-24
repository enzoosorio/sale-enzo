-- Baseline captured from the linked sale_enzo project (public schema, 2026-09-24).
-- Source: read-only Supabase CLI db dump. No application data is included.
-- pgvector and uuid-ossp live in extensions on Supabase.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text" DEFAULT NULL::"text", "p_subcategory_slug" "text" DEFAULT NULL::"text", "p_selected_tags" "text"[] DEFAULT '{}'::"text"[], "p_selected_colors" "text"[] DEFAULT '{}'::"text"[], "p_selected_brands" "text"[] DEFAULT '{}'::"text"[], "p_selected_sizes" "text"[] DEFAULT '{}'::"text"[], "p_gender" "text" DEFAULT NULL::"text", "p_fit" "text" DEFAULT NULL::"text", "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
with normalized as (
  select
    nullif(lower(trim(p_category_slug)), '') as category_slug,
    nullif(lower(trim(p_subcategory_slug)), '') as subcategory_slug,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_tags, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_tags,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_colors, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_colors,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_brands, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_brands,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_sizes, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_sizes,
    nullif(lower(trim(p_gender)), '') as gender,
    nullif(lower(trim(p_fit)), '') as fit,
    p_min_price as min_price,
    p_max_price as max_price
),
base_variants as (
  select
    v.id as variant_id,
    v.main_img_url,
    v.size,
    v.gender,
    v.fit,
    p.id as product_id,
    p.name as product_name,
    p.brand,
    sub.id as subcategory_id,
    sub.name as subcategory_name,
    sub.slug as subcategory_slug,
    parent.id as category_id,
    parent.name as category_name,
    parent.slug as category_slug,
    v.main_color_category_id,
    price_item.price,
    coalesce(
      (
        select jsonb_agg(distinct jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug
        ))
        from variant_tags vt
        join tags t on t.id = vt.tag_id
        where vt.variant_id = v.id
      ),
      '[]'::jsonb
    ) as tags_json,
    case
      when main_vcc.id is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'id', main_vcc.id,
          'label', main_vcc.label,
          'representative_hex', main_vcc.representative_hex
        )
      )
    end as colors_json,
    jsonb_pretty(
      coalesce(
        (
          select jsonb_agg(distinct jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug
          ))
          from variant_tags vt
          join tags t on t.id = vt.tag_id
          where vt.variant_id = v.id
        ),
        '[]'::jsonb
      )
    ) as debug_tags
  from product_variants v
  join products p on p.id = v.product_id
  join product_categories sub on sub.id = p.subcategory_id
  left join product_categories parent on parent.id = sub.parent_id
  left join variant_color_categories main_vcc
    on main_vcc.id = v.main_color_category_id
    and coalesce(main_vcc.is_hidden, false) = false
  left join lateral (
    select pi.price
    from product_items pi
    where pi.variant_id = v.id
      and coalesce(pi.stock, 0) > 0
      and coalesce(pi.status, 'available') in ('available', 'reserved')
    order by pi.price asc
    limit 1
  ) as price_item on true
  where p.is_active = true
),
filtered_variants_no_price as (
  select b.*
  from base_variants b
  cross join normalized n
  where
    (n.category_slug is null or lower(coalesce(b.category_slug, '')) = n.category_slug)
    and (n.subcategory_slug is null or lower(coalesce(b.subcategory_slug, '')) = n.subcategory_slug)
    and (
      array_length(n.selected_sizes, 1) is null
      or lower(coalesce(b.size, '')) = any(n.selected_sizes)
    )
    and (
      array_length(n.selected_brands, 1) is null
      or lower(coalesce(b.brand, '')) = any(n.selected_brands)
    )
    and (n.gender is null or lower(coalesce(b.gender, '')) = n.gender)
    and (n.fit is null or lower(coalesce(b.fit, '')) = n.fit)
    and (
      array_length(n.selected_tags, 1) is null
      or exists (
        select 1
        from variant_tags vt
        join tags t on t.id = vt.tag_id
        where vt.variant_id = b.variant_id
          and (
            lower(trim(coalesce(t.slug, ''))) = any(n.selected_tags)
            or lower(trim(coalesce(t.name, ''))) = any(n.selected_tags)
          )
      )
    )
    and (
      array_length(n.selected_colors, 1) is null
      or exists (
        select 1
        from product_variants pv
        join variant_color_categories vcc
          on vcc.id = pv.main_color_category_id
          and coalesce(vcc.is_hidden, false) = false
        where pv.id = b.variant_id
          and lower(trim(coalesce(vcc.label, ''))) = any(n.selected_colors)
      )
    )
),
filtered_variants as (
  select f.*
  from filtered_variants_no_price f
  cross join normalized n
  where
    (
      n.min_price is null
      or (f.price is not null and f.price >= n.min_price)
    )
    and (
      n.max_price is null
      or (f.price is not null and f.price <= n.max_price)
    )
),
navigation_variants_no_price as (
  select b.*
  from base_variants b
  cross join normalized n
  where
    (
      array_length(n.selected_sizes, 1) is null
      or lower(coalesce(b.size, '')) = any(n.selected_sizes)
    )
    and (
      array_length(n.selected_brands, 1) is null
      or lower(coalesce(b.brand, '')) = any(n.selected_brands)
    )
    and (n.gender is null or lower(coalesce(b.gender, '')) = n.gender)
    and (n.fit is null or lower(coalesce(b.fit, '')) = n.fit)
    and (
      array_length(n.selected_tags, 1) is null
      or exists (
        select 1
        from variant_tags vt
        join tags t on t.id = vt.tag_id
        where vt.variant_id = b.variant_id
          and (
            lower(trim(coalesce(t.slug, ''))) = any(n.selected_tags)
            or lower(trim(coalesce(t.name, ''))) = any(n.selected_tags)
          )
      )
    )
    and (
      array_length(n.selected_colors, 1) is null
      or exists (
        select 1
        from product_variants pv
        join variant_color_categories vcc
          on vcc.id = pv.main_color_category_id
          and coalesce(vcc.is_hidden, false) = false
        where pv.id = b.variant_id
          and lower(trim(coalesce(vcc.label, ''))) = any(n.selected_colors)
      )
    )
),
navigation_categories_variants as (
  select f.*
  from navigation_variants_no_price f
  cross join normalized n
  where
    (
      n.min_price is null
      or (f.price is not null and f.price >= n.min_price)
    )
    and (
      n.max_price is null
      or (f.price is not null and f.price <= n.max_price)
    )
),
navigation_subcategories_variants as (
  select f.*
  from navigation_variants_no_price f
  cross join normalized n
  where
    (n.category_slug is null or lower(coalesce(f.category_slug, '')) = n.category_slug)
    and (
      n.min_price is null
      or (f.price is not null and f.price >= n.min_price)
    )
    and (
      n.max_price is null
      or (f.price is not null and f.price <= n.max_price)
    )
),
available_tag_counts as (
  select
    t.elem ->> 'id' as id,
    t.elem ->> 'name' as name,
    t.elem ->> 'slug' as slug,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  cross join lateral jsonb_array_elements(f.tags_json) as t(elem)
  group by 1, 2, 3
),
available_color_counts as (
  select
    c.elem ->> 'id' as id,
    c.elem ->> 'label' as label,
    c.elem ->> 'representative_hex' as representative_hex,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  cross join lateral jsonb_array_elements(f.colors_json) as c(elem)
  group by 1, 2, 3
),
available_size_counts as (
  select
    f.size as value,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  where nullif(trim(coalesce(f.size, '')), '') is not null
  group by f.size
),
available_brand_counts as (
  select
    f.brand as value,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  where nullif(trim(coalesce(f.brand, '')), '') is not null
  group by f.brand
),
available_gender_counts as (
  select
    f.gender as value,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  where nullif(trim(coalesce(f.gender, '')), '') is not null
  group by f.gender
),
available_fit_counts as (
  select
    f.fit as value,
    count(distinct f.variant_id)::int as count
  from filtered_variants f
  where nullif(trim(coalesce(f.fit, '')), '') is not null
  group by f.fit
),
available_navigation_categories as (
  select
    f.category_slug as slug,
    f.category_name as name,
    count(distinct f.variant_id)::int as count
  from navigation_categories_variants f
  where nullif(trim(coalesce(f.category_slug, '')), '') is not null
    and nullif(trim(coalesce(f.category_name, '')), '') is not null
  group by f.category_slug, f.category_name
),
available_navigation_subcategories as (
  select
    f.subcategory_slug as slug,
    f.subcategory_name as name,
    count(distinct f.variant_id)::int as count
  from navigation_subcategories_variants f
  where nullif(trim(coalesce(f.subcategory_slug, '')), '') is not null
    and nullif(trim(coalesce(f.subcategory_name, '')), '') is not null
  group by f.subcategory_slug, f.subcategory_name
),
most_related as (
  select
    f.variant_id,
    f.main_img_url,
    f.product_id,
    f.product_name,
    f.size,
    f.price
  from filtered_variants f
  order by
    (f.price is null) asc,
    f.price asc,
    f.variant_id asc
  limit 1
)
select jsonb_build_object(
  'available_filters',
  jsonb_build_object(
    'tags',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug,
            'count', t.count
          )
          order by t.count desc, t.name asc
        )
        from available_tag_counts t
      ),
      '[]'::jsonb
    ),
    'colors',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'label', c.label,
            'representative_hex', c.representative_hex,
            'count', c.count
          )
          order by c.count desc, c.label asc
        )
        from available_color_counts c
      ),
      '[]'::jsonb
    ),
    'sizes',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'value', s.value,
            'count', s.count
          )
          order by s.value asc
        )
        from available_size_counts s
      ),
      '[]'::jsonb
    ),
    'brands',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'value', b.value,
            'count', b.count
          )
          order by b.count desc, b.value asc
        )
        from available_brand_counts b
      ),
      '[]'::jsonb
    ),
    'genders',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'value', g.value,
            'count', g.count
          )
          order by g.count desc, g.value asc
        )
        from available_gender_counts g
      ),
      '[]'::jsonb
    ),
    'fits',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'value', f.value,
            'count', f.count
          )
          order by f.count desc, f.value asc
        )
        from available_fit_counts f
      ),
      '[]'::jsonb
    ),
    'price_range',
    jsonb_build_object(
      'min', (select min(fv.price) from filtered_variants_no_price fv where fv.price is not null),
      'max', (select max(fv.price) from filtered_variants_no_price fv where fv.price is not null)
    )
  ),
  'navigation',
  jsonb_build_object(
    'categories',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug', c.slug,
            'name', c.name,
            'count', c.count
          )
          order by c.name asc
        )
        from available_navigation_categories c
      ),
      '[]'::jsonb
    ),
    'subcategories',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug', s.slug,
            'name', s.name,
            'count', s.count
          )
          order by s.name asc
        )
        from available_navigation_subcategories s
      ),
      '[]'::jsonb
    )
  ),
  'most_related_variant',
  coalesce(
    (
      select jsonb_build_object(
        'variant_id', m.variant_id,
        'main_img_url', m.main_img_url,
        'product_id', m.product_id,
        'product_name', m.product_name,
        'size', m.size,
        'price', m.price
      )
      from most_related m
    ),
    null
  ),
  'debug',
  jsonb_build_object(
    'variants_count', (select count(*) from filtered_variants),
    'tags_in_variants', (
      select jsonb_agg(distinct t.elem)
      from filtered_variants f
      cross join lateral jsonb_array_elements(f.tags_json) as t(elem)
    ),
    'variant_debug_tags', (
      select jsonb_agg(
        jsonb_build_object(
          'variant_id', f.variant_id,
          'debug_tags', f.debug_tags
        )
      )
      from filtered_variants f
    )
  )
);
$$;


ALTER FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric) IS 'Returns derived available filters + navigation + most related variant for category panel.';



CREATE OR REPLACE FUNCTION "public"."get_products_for_grid"("p_category_slug" "text" DEFAULT NULL::"text", "p_subcategory_slug" "text" DEFAULT NULL::"text", "p_selected_tags" "text"[] DEFAULT '{}'::"text"[], "p_selected_colors" "text"[] DEFAULT '{}'::"text"[], "p_selected_brands" "text"[] DEFAULT '{}'::"text"[], "p_selected_sizes" "text"[] DEFAULT '{}'::"text"[], "p_gender" "text" DEFAULT NULL::"text", "p_fit" "text" DEFAULT NULL::"text", "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric, "p_limit" integer DEFAULT 24, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
with normalized as (
  select
    nullif(lower(trim(p_category_slug)), '') as category_slug,
    nullif(lower(trim(p_subcategory_slug)), '') as subcategory_slug,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_tags, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_tags,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_colors, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_colors,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_brands, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_brands,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_sizes, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_sizes,
    nullif(lower(trim(p_gender)), '') as gender,
    nullif(lower(trim(p_fit)), '') as fit,
    p_min_price as min_price,
    p_max_price as max_price,
    greatest(coalesce(p_limit, 24), 1) as page_limit,
    greatest(coalesce(p_offset, 0), 0) as page_offset
),
base_rows as (
  select
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.brand as product_brand,
    sub.parent_id as product_category_id,
    p.is_active as product_is_active,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    v.id as variant_id,
    v.product_id as variant_product_id,
    v.size as variant_size,
    v.main_color_hex as variant_main_color_hex,
    v.main_color_category_id as variant_main_color_category_id,
    v.main_img_url as variant_main_img_url,
    v.gender as variant_gender,
    v.fit as variant_fit,
    v.metadata as variant_metadata,
    v.created_at as variant_created_at,
    item.id as item_id,
    item.variant_id as item_variant_id,
    item.condition as item_condition,
    item.price as item_price,
    item.sku as item_sku,
    item.stock as item_stock,
    item.seller_id as item_seller_id,
    item.status as item_status,
    item.created_at as item_created_at,
    parent.slug as category_slug,
    sub.slug as subcategory_slug
  from products p
  join product_variants v on v.product_id = p.id
  join product_categories sub on sub.id = p.subcategory_id
  left join product_categories parent on parent.id = sub.parent_id
  join lateral (
    select pi.*
    from product_items pi
    where pi.variant_id = v.id
      and coalesce(pi.stock, 0) > 0
      and coalesce(pi.status,'available') in ('available','reserved')
    order by pi.price asc, pi.created_at asc, pi.id asc
    limit 1
  ) as item on true
  where p.is_active = true
),
filtered_rows as (
  select b.*
  from base_rows b
  cross join normalized n
  where
    (n.category_slug is null or lower(coalesce(b.category_slug, '')) = n.category_slug)
    and (n.subcategory_slug is null or lower(coalesce(b.subcategory_slug, '')) = n.subcategory_slug)
    and (
      array_length(n.selected_sizes, 1) is null
      or lower(coalesce(b.variant_size, '')) = any(n.selected_sizes)
    )
    and (
      array_length(n.selected_brands, 1) is null
      or lower(coalesce(b.product_brand, '')) = any(n.selected_brands)
    )
    and (n.gender is null or lower(coalesce(b.variant_gender, '')) = n.gender)
    and (n.fit is null or lower(coalesce(b.variant_fit, '')) = n.fit)
    and (
      array_length(n.selected_tags, 1) is null
      or exists (
        select 1
        from variant_tags vt
        join tags t on t.id = vt.tag_id
        where vt.variant_id = b.variant_id
          and (
            lower(trim(coalesce(t.slug, ''))) = any(n.selected_tags)
            or lower(trim(coalesce(t.name, ''))) = any(n.selected_tags)
          )
      )
    )
    and (
      array_length(n.selected_colors, 1) is null
      or exists (
        select 1
        from variant_color_categories vcc
        where vcc.id = b.variant_main_color_category_id
          and coalesce(vcc.is_hidden, false) = false
          and lower(trim(coalesce(vcc.label, ''))) = any(n.selected_colors)
      )
    )
    and (
      n.min_price is null
      or b.item_price >= n.min_price
    )
    and (
      n.max_price is null
      or b.item_price <= n.max_price
    )
),
paginated as (
  select
    f.*,
    count(*) over()::int as total_count
  from filtered_rows f
  order by f.item_price asc, f.product_created_at desc, f.variant_id asc
  limit (select page_limit from normalized)
  offset (select page_offset from normalized)
)
select jsonb_build_object(
  'products',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'product', jsonb_build_object(
            'id', p.product_id,
            'name', p.product_name,
            'description', p.product_description,
            'brand', coalesce(p.product_brand, ''),
            'category_id', p.product_category_id,
            'is_active', p.product_is_active,
            'created_at', p.product_created_at,
            'updated_at', p.product_updated_at
          ),
          'variant', jsonb_build_object(
            'id', p.variant_id,
            'product_id', p.variant_product_id,
            'size', p.variant_size,
            'main_color_hex', p.variant_main_color_hex,
            'main_color_category_id', p.variant_main_color_category_id,
            'main_img_url', p.variant_main_img_url,
            'gender', p.variant_gender,
            'fit', p.variant_fit,
            'metadata', p.variant_metadata,
            'created_at', p.variant_created_at
          ),
          'item', jsonb_build_object(
            'id', p.item_id,
            'variant_id', p.item_variant_id,
            'condition', p.item_condition,
            'price', p.item_price,
            'sku', p.item_sku,
            'stock', p.item_stock,
            'seller_id', p.item_seller_id,
            'status', p.item_status,
            'created_at', p.item_created_at
          )
        )
      )
      from paginated p
    ),
    '[]'::jsonb
  ),
  'total_count',
  coalesce((select max(p.total_count) from paginated p), 0)
);
$$;


ALTER FUNCTION "public"."get_products_for_grid"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_products_for_grid"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) IS 'Returns paginated products for the grid with product + variant + cheapest in-stock active item and total_count.';



CREATE OR REPLACE FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text" DEFAULT NULL::"text", "p_subcategory_slug" "text" DEFAULT NULL::"text", "p_selected_tags" "text"[] DEFAULT '{}'::"text"[], "p_selected_colors" "text"[] DEFAULT '{}'::"text"[], "p_selected_brands" "text"[] DEFAULT '{}'::"text"[], "p_selected_sizes" "text"[] DEFAULT '{}'::"text"[], "p_gender" "text" DEFAULT NULL::"text", "p_fit" "text" DEFAULT NULL::"text", "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric, "p_limit" integer DEFAULT 24, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
with normalized as (
  select
    nullif(lower(trim(p_category_slug)), '') as category_slug,
    nullif(lower(trim(p_subcategory_slug)), '') as subcategory_slug,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_tags, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_tags,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_colors, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_colors,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_brands, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_brands,
    coalesce(
      array(
        select distinct lower(trim(x))
        from unnest(coalesce(p_selected_sizes, '{}'::text[])) as x
        where nullif(trim(x), '') is not null
      ),
      '{}'::text[]
    ) as selected_sizes,
    nullif(lower(trim(p_gender)), '') as gender,
    nullif(lower(trim(p_fit)), '') as fit,
    p_min_price as min_price,
    p_max_price as max_price,
    greatest(coalesce(p_limit, 24), 1) as page_limit,
    greatest(coalesce(p_offset, 0), 0) as page_offset
),
variant_scope as (
  select
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.brand as product_brand,
    sub.parent_id as product_category_id,
    p.is_active as product_is_active,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    v.id as variant_id,
    v.product_id as variant_product_id,
    v.size as variant_size,
    v.main_color_hex as variant_main_color_hex,
    v.main_color_category_id as variant_main_color_category_id,
    v.main_img_url as variant_main_img_url,
    v.gender as variant_gender,
    v.fit as variant_fit,
    v.metadata as variant_metadata,
    v.created_at as variant_created_at,
    parent.slug as category_slug,
    sub.slug as subcategory_slug,
    lower(trim(coalesce(v.size, ''))) as variant_size_norm,
    lower(trim(coalesce(p.brand, ''))) as product_brand_norm,
    lower(trim(coalesce(v.gender, ''))) as variant_gender_norm,
    lower(trim(coalesce(v.fit, ''))) as variant_fit_norm,
    lower(trim(coalesce(vcc.label, ''))) as color_label_norm
  from products p
  join product_variants v on v.product_id = p.id
  join product_categories sub on sub.id = p.subcategory_id
  left join product_categories parent on parent.id = sub.parent_id
  left join variant_color_categories vcc
    on vcc.id = v.main_color_category_id
    and coalesce(vcc.is_hidden, false) = false
  where p.is_active = true
),
variant_tag_tokens as (
  select
    vt.variant_id,
    array_agg(distinct tok.token) filter (where tok.token <> '') as tag_tokens
  from variant_tags vt
  join tags t on t.id = vt.tag_id
  cross join lateral unnest(
    array[
      lower(trim(coalesce(t.slug, ''))),
      lower(trim(coalesce(t.name, '')))
    ]
  ) as tok(token)
  group by vt.variant_id
),
cheapest_items as (
  select distinct on (pi.variant_id)
    pi.variant_id,
    pi.id as item_id,
    pi.condition as item_condition,
    pi.price as item_price,
    pi.sku as item_sku,
    pi.stock as item_stock,
    pi.seller_id as item_seller_id,
    pi.status as item_status,
    pi.created_at as item_created_at
  from product_items pi
  where coalesce(pi.stock, 0) > 0
    and coalesce(pi.status, 'available') in ('available', 'reserved')
  order by pi.variant_id, pi.price asc, pi.created_at asc, pi.id asc
),
filtered_rows as (
  select
    vs.*,
    ci.item_id,
    ci.item_condition,
    ci.item_price,
    ci.item_sku,
    ci.item_stock,
    ci.item_seller_id,
    ci.item_status,
    ci.item_created_at
  from variant_scope vs
  join cheapest_items ci on ci.variant_id = vs.variant_id
  left join variant_tag_tokens vtt on vtt.variant_id = vs.variant_id
  cross join normalized n
  where
    (n.category_slug is null or lower(coalesce(vs.category_slug, '')) = n.category_slug)
    and (n.subcategory_slug is null or lower(coalesce(vs.subcategory_slug, '')) = n.subcategory_slug)
    and (
      array_length(n.selected_sizes, 1) is null
      or vs.variant_size_norm = any(n.selected_sizes)
    )
    and (
      array_length(n.selected_brands, 1) is null
      or vs.product_brand_norm = any(n.selected_brands)
    )
    and (n.gender is null or vs.variant_gender_norm = n.gender)
    and (n.fit is null or vs.variant_fit_norm = n.fit)
    and (
      array_length(n.selected_tags, 1) is null
      or coalesce(vtt.tag_tokens, '{}'::text[]) && n.selected_tags
    )
    and (
      array_length(n.selected_colors, 1) is null
      or vs.color_label_norm = any(n.selected_colors)
    )
    and (n.min_price is null or ci.item_price >= n.min_price)
    and (n.max_price is null or ci.item_price <= n.max_price)
),
paginated as (
  select
    f.*,
    count(*) over()::int as total_count
  from filtered_rows f
  order by f.item_price asc, f.product_created_at desc, f.variant_id asc
  limit (select page_limit from normalized)
  offset (select page_offset from normalized)
)
select jsonb_build_object(
  'products',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'product', jsonb_build_object(
            'id', p.product_id,
            'name', p.product_name,
            'description', p.product_description,
            'brand', coalesce(p.product_brand, ''),
            'category_id', p.product_category_id,
            'is_active', p.product_is_active,
            'created_at', p.product_created_at,
            'updated_at', p.product_updated_at
          ),
          'variant', jsonb_build_object(
            'id', p.variant_id,
            'product_id', p.variant_product_id,
            'size', p.variant_size,
            'main_color_hex', p.variant_main_color_hex,
            'main_color_category_id', p.variant_main_color_category_id,
            'main_img_url', p.variant_main_img_url,
            'gender', p.variant_gender,
            'fit', p.variant_fit,
            'metadata', p.variant_metadata,
            'created_at', p.variant_created_at
          ),
          'item', jsonb_build_object(
            'id', p.item_id,
            'variant_id', p.variant_id,
            'condition', p.item_condition,
            'price', p.item_price,
            'sku', p.item_sku,
            'stock', p.item_stock,
            'seller_id', p.item_seller_id,
            'status', p.item_status,
            'created_at', p.item_created_at
          )
        )
      )
      from paginated p
    ),
    '[]'::jsonb
  ),
  'total_count',
  coalesce((select max(p.total_count) from paginated p), 0)
);
$$;


ALTER FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) IS 'v11 optimized: paginated products for grid with product + variant + cheapest in-stock active item and total_count.';



CREATE OR REPLACE FUNCTION "public"."handle_email_verified"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Solo cuando el email pasa de NO confirmado → confirmado
  if old.email_confirmed_at is null
     and new.email_confirmed_at is not null then

    update public.users
    set verified_email = true
    where id = new.id;

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_email_verified"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    verified_email,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      new.phone,
      new.raw_user_meta_data ->> 'phone'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(
      (new.raw_user_meta_data ->> 'email_verified')::boolean,
      false
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    verified_email = excluded.verified_email,
    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    verified_email,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      new.phone,
      new.raw_user_meta_data ->> 'phone'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(
      (new.raw_user_meta_data ->> 'email_verified')::boolean,
      false
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    verified_email = excluded.verified_email,
    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "user_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_images" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "img_url" "text",
    "category_id" "uuid" DEFAULT "gen_random_uuid"(),
    "orientation" "text" DEFAULT 'portrait'::"text" NOT NULL,
    CONSTRAINT "category_images_orientation_check" CHECK (("orientation" = ANY (ARRAY['portrait'::"text", 'landscape'::"text"])))
);


ALTER TABLE "public"."category_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."color_base_names" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "hex" "text" NOT NULL,
    "lab_l" double precision NOT NULL,
    "lab_a" double precision NOT NULL,
    "lab_b" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."color_base_names" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "user_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid",
    "variant_id" "uuid",
    "price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "payment_provider_id" "uuid",
    "payment_status" "text",
    "metadata" "jsonb",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_provider" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."payment_provider" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid"
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid",
    "condition" "text",
    "price" numeric(10,2) NOT NULL,
    "sku" "text",
    "stock" integer DEFAULT 1,
    "seller_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_items_condition_check" CHECK (("condition" = ANY (ARRAY['new'::"text", 'like-new'::"text", 'semi-used'::"text", 'used'::"text", 'worn'::"text"])))
);


ALTER TABLE "public"."product_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_rag_profiles" (
    "product_item_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1,
    "metadata" "jsonb"
);


ALTER TABLE "public"."product_rag_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "size" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "main_color_hex" "text",
    "main_color_category_id" "uuid",
    "main_img_url" "text" NOT NULL,
    "gender" "text",
    "fit" "text"
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."product_variants"."main_color_hex" IS 'The dominant color of the product';



COMMENT ON COLUMN "public"."product_variants"."main_color_category_id" IS 'The cluster category to which primary color belongs to';



COMMENT ON COLUMN "public"."product_variants"."main_img_url" IS 'The first image user will see of the product';



COMMENT ON COLUMN "public"."product_variants"."gender" IS 'Optional gender diferentiation of the product';



COMMENT ON COLUMN "public"."product_variants"."fit" IS 'Optional fit in some products';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "brand" "text",
    "subcategory_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."category_images" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subcategory_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'This is the table where all tags are saved';



COMMENT ON COLUMN "public"."tags"."slug" IS 'other representation of tag';



CREATE TABLE IF NOT EXISTS "public"."user_features" (
    "user_id" "uuid" NOT NULL,
    "persona" "jsonb",
    "preferences" "jsonb",
    "affinities" "jsonb",
    "behavioral_signals" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interactions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "variant_id" "uuid",
    "interaction_type" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_rag_profiles" (
    "user_id" "uuid" NOT NULL,
    "summary_text" "text" NOT NULL,
    "embedding" "extensions"."vector"(1536),
    "version" integer DEFAULT 1,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_rag_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "avatar_url" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "verified_email" boolean,
    "updated_at" timestamp with time zone,
    "role" "text" DEFAULT 'customer'::"text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."first_name" IS 'This would be the first name of the registered user';



COMMENT ON COLUMN "public"."users"."last_name" IS 'This is the last name of the registered user';



COMMENT ON COLUMN "public"."users"."verified_email" IS 'Check if user has already verified his email';



COMMENT ON COLUMN "public"."users"."role" IS 'user roles for authorization';



CREATE TABLE IF NOT EXISTS "public"."variant_color_categories" (
    "id" "uuid" NOT NULL,
    "centroid_l" double precision NOT NULL,
    "centroid_a" double precision NOT NULL,
    "centroid_b" double precision NOT NULL,
    "representative_hex" character varying(10) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "color_count" integer DEFAULT 1,
    "is_locked" boolean DEFAULT false,
    "is_hidden" boolean DEFAULT false,
    "label" "text",
    "weighted_count" numeric DEFAULT 0,
    "suggested_label" "text"
);


ALTER TABLE "public"."variant_color_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variant_colors" (
    "id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "color_category_id" "uuid" NOT NULL,
    "original_hex" character varying(10) NOT NULL,
    "l" double precision NOT NULL,
    "a" double precision NOT NULL,
    "b" double precision NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "weight" numeric DEFAULT 1.0
);


ALTER TABLE "public"."variant_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variant_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "variant_id" "uuid",
    "image_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "position" "text" DEFAULT 'random'::"text"
);


ALTER TABLE "public"."variant_images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."variant_images"."position" IS 'Position in which the image will be displayed';



CREATE TABLE IF NOT EXISTS "public"."variant_tags" (
    "variant_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."variant_tags" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("user_id", "variant_id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."color_base_names"
    ADD CONSTRAINT "color_base_names_hex_key" UNIQUE ("hex");



ALTER TABLE ONLY "public"."color_base_names"
    ADD CONSTRAINT "color_base_names_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."color_base_names"
    ADD CONSTRAINT "color_base_names_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_color_categories"
    ADD CONSTRAINT "color_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id", "variant_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_provider"
    ADD CONSTRAINT "payment_provider_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_colors"
    ADD CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_items"
    ADD CONSTRAINT "product_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_rag_profiles"
    ADD CONSTRAINT "product_rag_profiles_pkey" PRIMARY KEY ("product_item_id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_images"
    ADD CONSTRAINT "subcategory_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_features"
    ADD CONSTRAINT "user_features_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_rag_profiles"
    ADD CONSTRAINT "user_rag_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_tags"
    ADD CONSTRAINT "variant_tags_pkey" PRIMARY KEY ("variant_id", "tag_id");



CREATE INDEX "idx_categories_parent" ON "public"."product_categories" USING "btree" ("parent_id");



CREATE INDEX "idx_category_images_category_id" ON "public"."category_images" USING "btree" ("category_id");



CREATE INDEX "idx_product_items_variant_price" ON "public"."product_items" USING "btree" ("variant_id", "price") WHERE ("stock" > 0);



CREATE INDEX "idx_product_rag_profiles_embedding_hnsw" ON "public"."product_rag_profiles" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops") WITH ("m"='16');



CREATE INDEX "idx_product_variants_product" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_products_created_at" ON "public"."products" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_products_subcategory" ON "public"."products" USING "btree" ("subcategory_id");



CREATE INDEX "idx_subcategory_images_subcategory" ON "public"."category_images" USING "btree" ("category_id");



CREATE INDEX "idx_user_rag_profiles_embedding" ON "public"."user_rag_profiles" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_variant_tags_tag" ON "public"."variant_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_variant_tags_variant" ON "public"."variant_tags" USING "btree" ("variant_id");



CREATE OR REPLACE TRIGGER "trg_product_rag_set_updated_at" BEFORE UPDATE ON "public"."product_rag_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_provider_id_fkey" FOREIGN KEY ("payment_provider_id") REFERENCES "public"."payment_provider"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variant_colors"
    ADD CONSTRAINT "product_colors_color_category_id_fkey" FOREIGN KEY ("color_category_id") REFERENCES "public"."variant_color_categories"("id");



ALTER TABLE ONLY "public"."variant_images"
    ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_items"
    ADD CONSTRAINT "product_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."product_items"
    ADD CONSTRAINT "product_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_rag_profiles"
    ADD CONSTRAINT "product_rag_profiles_product_item_id_fkey" FOREIGN KEY ("product_item_id") REFERENCES "public"."product_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_main_color_category_id_fkey" FOREIGN KEY ("main_color_category_id") REFERENCES "public"."variant_color_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."category_images"
    ADD CONSTRAINT "subcategory_images_subcategory_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_features"
    ADD CONSTRAINT "user_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."user_rag_profiles"
    ADD CONSTRAINT "user_rag_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_colors"
    ADD CONSTRAINT "variant_colors_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_tags"
    ADD CONSTRAINT "variant_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_tags"
    ADD CONSTRAINT "variant_tags_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



CREATE POLICY "Enable read access for all users" ON "public"."product_categories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."product_items" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."variant_tags" FOR SELECT USING (true);



CREATE POLICY "cart_delete_own" ON "public"."cart_items" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cart_insert_own" ON "public"."cart_items" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_select_own" ON "public"."cart_items" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cart_update_own" ON "public"."cart_items" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "categories_admin_write" ON "public"."product_categories" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."category_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."color_base_names" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "favorites_delete_own" ON "public"."favorites" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "favorites_insert_own" ON "public"."favorites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "favorites_insert_variant_exists" ON "public"."favorites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "favorites_select_own" ON "public"."favorites" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_admin_manage" ON "public"."order_items" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "order_items_delete_own" ON "public"."order_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_insert_own" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_select_own" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "order_items_update_own" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_admin_manage" ON "public"."orders" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "orders_delete_admin" ON "public"."orders" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "orders_insert_own" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "orders_select_own" ON "public"."orders" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "orders_update_own" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "orders_update_paymentstatus" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."payment_provider" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_provider_admin_write" ON "public"."payment_provider" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "payment_provider_select_for_auth" ON "public"."payment_provider" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_admin_write" ON "public"."variant_images" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "product_images_select_for_auth" ON "public"."variant_images" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."product_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_rag_admin_write" ON "public"."product_rag_profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."product_rag_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_rag_select_for_auth" ON "public"."product_rag_profiles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_variants_admin_write" ON "public"."product_variants" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "product_variants_select_for_auth" ON "public"."product_variants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "product_variants_select_for_public" ON "public"."product_variants" FOR SELECT USING (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_admin_write" ON "public"."products" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "products_select_for_auth" ON "public"."products" FOR SELECT TO "authenticated" USING (("is_active" IS TRUE));



CREATE POLICY "products_select_for_public" ON "public"."products" FOR SELECT USING (("is_active" IS TRUE));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_select_for_all_users" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "user_rag_admin_manage" ON "public"."user_rag_profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "user_rag_delete_own" ON "public"."user_rag_profiles" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_rag_insert_own" ON "public"."user_rag_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_rag_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_rag_select_own" ON "public"."user_rag_profiles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_rag_update_own" ON "public"."user_rag_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_manage" ON "public"."users" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "users_delete_own" ON "public"."users" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users_insert_self" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."variant_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."variant_tags" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_filters_payload"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_for_grid"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_for_grid"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_for_grid"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_for_grid_v2"("p_category_slug" "text", "p_subcategory_slug" "text", "p_selected_tags" "text"[], "p_selected_colors" "text"[], "p_selected_brands" "text"[], "p_selected_sizes" "text"[], "p_gender" "text", "p_fit" "text", "p_min_price" numeric, "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_email_verified"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_email_verified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_email_verified"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."category_images" TO "anon";
GRANT ALL ON TABLE "public"."category_images" TO "authenticated";
GRANT ALL ON TABLE "public"."category_images" TO "service_role";



GRANT ALL ON TABLE "public"."color_base_names" TO "anon";
GRANT ALL ON TABLE "public"."color_base_names" TO "authenticated";
GRANT ALL ON TABLE "public"."color_base_names" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_provider" TO "anon";
GRANT ALL ON TABLE "public"."payment_provider" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_provider" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_items" TO "anon";
GRANT ALL ON TABLE "public"."product_items" TO "authenticated";
GRANT ALL ON TABLE "public"."product_items" TO "service_role";



GRANT ALL ON TABLE "public"."product_rag_profiles" TO "anon";
GRANT ALL ON TABLE "public"."product_rag_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."product_rag_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subcategory_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subcategory_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subcategory_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_features" TO "anon";
GRANT ALL ON TABLE "public"."user_features" TO "authenticated";
GRANT ALL ON TABLE "public"."user_features" TO "service_role";



GRANT ALL ON TABLE "public"."user_interactions" TO "anon";
GRANT ALL ON TABLE "public"."user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_rag_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_rag_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_rag_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."variant_color_categories" TO "anon";
GRANT ALL ON TABLE "public"."variant_color_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_color_categories" TO "service_role";



GRANT ALL ON TABLE "public"."variant_colors" TO "anon";
GRANT ALL ON TABLE "public"."variant_colors" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_colors" TO "service_role";



GRANT ALL ON TABLE "public"."variant_images" TO "anon";
GRANT ALL ON TABLE "public"."variant_images" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_images" TO "service_role";



GRANT ALL ON TABLE "public"."variant_tags" TO "anon";
GRANT ALL ON TABLE "public"."variant_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_tags" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
