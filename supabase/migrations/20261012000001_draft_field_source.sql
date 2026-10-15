-- Field provenance for AI-assisted capture: per DraftFields key, "user" means
-- the owner typed/dictated it (never overwritten by the AI), "ai" means it was
-- filled from photo analysis (reconfirmable). Empty by default.

alter table staging.product_drafts
  add column if not exists field_source jsonb not null default '{}'::jsonb;
