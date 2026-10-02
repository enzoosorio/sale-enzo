-- Photo roles for the capture wizard: every draft photo can be assigned to a
-- named slot (front, back, label...). NULL means "taken but not yet assigned".
-- Photos can be shot in any order and moved into their slot afterwards.

alter table staging.draft_images
  add column shot_role text
  check (shot_role in ('front', 'back', 'label', 'detail', 'defect', 'extra'));

-- One photo per named slot; "extra" can repeat.
create unique index draft_images_role_idx
  on staging.draft_images (draft_id, shot_role)
  where shot_role is not null and shot_role <> 'extra';

-- Existing photos: the main one is the front shot.
update staging.draft_images set shot_role = 'front' where is_main;
