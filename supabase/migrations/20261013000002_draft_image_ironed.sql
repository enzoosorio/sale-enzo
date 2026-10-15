-- "Planchado" (AI wrinkle smoothing) renditions of a captured photo.
-- The plain cutout and the original are never touched; the ironed cutout lives in its own
-- versioned R2 keys (public media is cached as immutable, so a regeneration needs a new key).
--
-- ironed_status: none -> pending (generating) -> ready (waiting for the owner)
--                -> accepted (ships to the storefront) | rejected | failed
-- ironed_version: generations so far; also the version suffix of the R2 keys
-- ironed_check:   automatic comparison with the plain cutout (silhouette + palette)

alter table staging.draft_images
  add column if not exists ironed_status text not null default 'none'
    check (ironed_status in ('none', 'pending', 'ready', 'accepted', 'rejected', 'failed')),
  add column if not exists ironed_key text,
  add column if not exists ironed_web_key text,
  add column if not exists ironed_provider text,
  add column if not exists ironed_version integer not null default 0 check (ironed_version >= 0),
  add column if not exists ironed_check jsonb;
