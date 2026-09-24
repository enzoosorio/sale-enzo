-- Staging schema: flat product drafts captured by voice / xlsx / manual entry.
-- Drafts are reviewed in /admin/staging and published into the hierarchical
-- public schema (products -> product_variants -> product_items).
--
-- MANUAL STEP: add "staging" to Dashboard -> Project Settings -> API -> Exposed schemas.

create schema if not exists staging;

grant usage on schema staging to authenticated, service_role;

create type staging.draft_status_t as enum ('capturing', 'pending_review', 'approved', 'published', 'discarded');
create type staging.image_status_t as enum ('pending', 'processing', 'done', 'failed');
create type staging.match_kind_t   as enum ('new_product', 'new_variant', 'new_item');
create type staging.draft_source_t as enum ('voice', 'xlsx', 'manual');

create sequence staging.sku_seq start 1;

create or replace function staging.next_sku()
returns text
language sql
volatile
as $$
  select 'SE-' || lpad(nextval('staging.sku_seq')::text, 4, '0');
$$;

create table staging.product_drafts (
  id                    uuid primary key default gen_random_uuid(),
  sku                   text not null unique default staging.next_sku(),
  status                staging.draft_status_t not null default 'capturing',
  source                staging.draft_source_t not null default 'manual',
  transcript            text,
  ai_raw                jsonb,
  source_row            jsonb,

  -- Segmentation (AI-proposed, owner-editable)
  match_kind            staging.match_kind_t,
  target_product_id     uuid references public.products(id) on delete set null,
  target_variant_id     uuid references public.product_variants(id) on delete set null,
  -- sibling draft not yet published (e.g. same polo in another color from the same xlsx run)
  target_draft_id       uuid references staging.product_drafts(id) on delete set null,
  match_reason          text,

  -- Product level
  name                  text,
  brand                 text,
  description           text,
  category_id           uuid references public.product_categories(id),
  subcategory_id        uuid references public.product_categories(id),

  -- Variant level
  size                  text check (size in ('XS','S','M','L','XL','XXL','XXXL')),
  gender                text check (gender in ('male','female','unisex')),
  also_unisex           boolean not null default false,
  fit                   text check (fit in ('slim','regular','oversize','boxy')),
  fits_like_min         text check (fits_like_min in ('XS','S','M','L','XL','XXL','XXXL')),
  fits_like_max         text check (fits_like_max in ('XS','S','M','L','XL','XXL','XXXL')),
  metadata              jsonb not null default '{}'::jsonb,
  main_color_hex        text check (main_color_hex ~ '^#[0-9a-fA-F]{6}$'),
  secondary_colors      text[] not null default '{}',
  tags                  text[] not null default '{}',

  -- Item level
  condition_score       numeric(3,1) check (condition_score between 1 and 10 and (condition_score * 2) = trunc(condition_score * 2)),
  condition_note        text,
  price                 numeric(10,2) check (price > 0),
  compare_at_price      numeric(10,2) check (compare_at_price > 0),
  stock                 integer not null default 1 check (stock >= 0),

  -- Private: never copied to storefront-readable tables
  specs_raw             text,
  defects               jsonb not null default '[]'::jsonb,
  price_notes           text,
  internal_notes        text,

  -- Quality
  missing_fields        text[] not null default '{}',
  field_confidence      jsonb not null default '{}'::jsonb,

  -- Publish trace
  published_product_id  uuid references public.products(id) on delete set null,
  published_variant_id  uuid references public.product_variants(id) on delete set null,
  published_item_id     uuid references public.product_items(id) on delete set null,
  published_at          timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index product_drafts_status_idx on staging.product_drafts (status, created_at desc);
create index product_drafts_subcategory_idx on staging.product_drafts (subcategory_id);

create table staging.draft_images (
  id              uuid primary key default gen_random_uuid(),
  draft_id        uuid not null references staging.product_drafts(id) on delete cascade,
  position        integer not null,
  is_main         boolean not null default false,
  original_key    text,
  cutout_key      text,
  cutout_web_key  text,
  width           integer,
  height          integer,
  bytes_original  integer,
  bytes_cutout    integer,
  bytes_web       integer,
  dominant_colors text[] not null default '{}',
  status          staging.image_status_t not null default 'pending',
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (draft_id, position)
);

create unique index draft_images_one_main_idx on staging.draft_images (draft_id) where is_main;

create or replace function staging.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger product_drafts_touch before update on staging.product_drafts
  for each row execute function staging.touch_updated_at();
create trigger draft_images_touch before update on staging.draft_images
  for each row execute function staging.touch_updated_at();

-- RLS: admin only (public.is_admin() reads auth.jwt()->>'role')
alter table staging.product_drafts enable row level security;
alter table staging.draft_images   enable row level security;

create policy "admin all drafts" on staging.product_drafts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all draft images" on staging.draft_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on all tables in schema staging to authenticated, service_role;
grant usage, select on all sequences in schema staging to authenticated, service_role;
grant execute on function staging.next_sku() to authenticated, service_role;
