-- Minimal additions to public so published drafts keep their full value
-- without breaking get_products_for_grid_v2, the storefront or RAG.

-- Item-level public fields
alter table public.product_items
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists condition_score  numeric(3,1),
  add column if not exists condition_note   text;

-- Image variants stored in Cloudflare R2
--   image_url        -> public web cutout (compressed, used by the storefront)
--   cutout_full_url  -> public full-resolution cutout (zoom)
--   original_key     -> private original object key (signed download only)
alter table public.variant_images
  add column if not exists cutout_full_url text,
  add column if not exists original_key    text;

-- Private per-item notes: specs and defects the owner tracks but customers never read raw.
create table if not exists public.product_item_notes (
  item_id         uuid primary key references public.product_items(id) on delete cascade,
  specs_raw       text,
  defects         jsonb not null default '[]'::jsonb,
  price_notes     text,
  internal_notes  text,
  source_draft_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.product_item_notes enable row level security;

create policy "admin all item notes" on public.product_item_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Closed brand list: drives AI suggestions and the STT vocabulary prompt.
create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "public read brands" on public.brands for select using (true);
create policy "admin write brands" on public.brands
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.brands (name) values
  ('Nike'), ('Under Armour'), ('The North Face'), ('Gymshark'), ('Puma'),
  ('Adidas'), ('Reebok'), ('New Balance'), ('Columbia'), ('Patagonia')
on conflict (name) do nothing;

insert into public.brands (name)
select distinct initcap(trim(brand)) from public.products
where brand is not null and trim(brand) <> ''
on conflict (name) do nothing;

-- Seed the polo taxonomy if missing (category "Polos" -> 2 subcategories)
insert into public.product_categories (name, slug, parent_id)
select 'Polos', 'polos', null
where not exists (select 1 from public.product_categories where slug = 'polos' and parent_id is null);

insert into public.product_categories (name, slug, parent_id)
select s.name, s.slug, c.id
from public.product_categories c
cross join (values ('Polos manga corta', 'polos-manga-corta'), ('Polos manga larga', 'polos-manga-larga')) as s(name, slug)
where c.slug = 'polos' and c.parent_id is null
  and not exists (select 1 from public.product_categories x where x.slug = s.slug and x.parent_id = c.id);
