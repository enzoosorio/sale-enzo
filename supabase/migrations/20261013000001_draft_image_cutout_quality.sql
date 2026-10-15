-- Background-removal provenance and quality for every captured photo.
-- bg_provider:    which provider produced the cutout that was kept (imgly | replicate)
-- cutout_quality: result of the automatic quality gate (verdict, reasons, metrics)
-- needs_review:   no provider passed the gate; the owner must look at this cutout

alter table staging.draft_images
  add column if not exists bg_provider text check (bg_provider in ('imgly', 'replicate')),
  add column if not exists cutout_quality jsonb,
  add column if not exists needs_review boolean not null default false;
