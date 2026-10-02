"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import {
  computeMissingFields,
  DraftFieldsSchema,
  DraftStatusSchema,
  EMPTY_DRAFT_FIELDS,
  ShotRoleSchema,
  type DraftFields,
  type ShotRole,
} from "@/lib/catalog/schema";
import { isSingleSlot, roleRank } from "@/lib/capture/photoSlots";
import { getDraft, staging } from "@/lib/staging/db";
import { deleteObjects } from "@/lib/r2";
import type { DraftImageRow, DraftRow, DraftSource, DraftWithImages } from "@/types/staging";

type Result<T = undefined> = { success: true; data: T } | { success: false; error: string };

const unauthorized = { success: false, error: "Unauthorized: Admin access required" } as const;

/** Picks only DraftFields keys from a row, so validation ignores bookkeeping columns. */
function fieldsOf(row: Partial<DraftRow>): DraftFields {
  const out = { ...EMPTY_DRAFT_FIELDS };
  for (const key of Object.keys(EMPTY_DRAFT_FIELDS) as (keyof DraftFields)[]) {
    if (row[key] !== undefined) (out as Record<string, unknown>)[key] = row[key];
  }
  // numeric columns come back as strings from PostgREST
  for (const key of ["condition_score", "price", "compare_at_price"] as const) {
    if (typeof out[key] === "string") (out as Record<string, unknown>)[key] = Number(out[key]);
  }
  return out;
}

export async function createDraft(
  source: DraftSource = "manual",
  initial: Partial<DraftFields> = {},
): Promise<Result<{ id: string; sku: string; draft: DraftWithImages }>> {
  if (!(await getAdminUserId())) return unauthorized;

  const parsed = DraftFieldsSchema.partial().safeParse(initial);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const fields = { ...EMPTY_DRAFT_FIELDS, ...parsed.data };
  const { data, error } = await staging()
    .from("product_drafts")
    .insert({
      ...fields,
      source,
      status: source === "xlsx" ? "pending_review" : "capturing",
      missing_fields: computeMissingFields(fields),
    })
    .select("id, sku")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Insert failed" };
  const draft = await getDraft(data.id);
  if (!draft) return { success: false, error: "Draft vanished" };
  revalidatePath("/admin/staging");
  return { success: true, data: { ...data, draft } };
}

const UpdateSchema = DraftFieldsSchema.partial().extend({
  status: DraftStatusSchema.optional(),
  transcript: z.string().nullable().optional(),
  field_confidence: z.record(z.string(), z.number()).optional(),
  ai_raw: z.unknown().optional(),
});
export type DraftUpdate = z.infer<typeof UpdateSchema>;

export async function updateDraft(id: string, patch: DraftUpdate): Promise<Result<DraftWithImages>> {
  if (!(await getAdminUserId())) return unauthorized;

  const parsed = UpdateSchema.safeParse(patch);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const current = await getDraft(id);
  if (!current) return { success: false, error: "Draft not found" };
  if (current.status === "published") return { success: false, error: "Draft already published" };

  const merged = fieldsOf({ ...current, ...parsed.data } as DraftRow);
  const { error } = await staging()
    .from("product_drafts")
    .update({ ...parsed.data, missing_fields: computeMissingFields(merged) })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/staging/${id}`);
  revalidatePath("/admin/staging");
  const updated = await getDraft(id);
  return updated ? { success: true, data: updated } : { success: false, error: "Draft vanished" };
}

export async function discardDraft(id: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const { error } = await staging()
    .from("product_drafts")
    .update({ status: "discarded" })
    .eq("id", id)
    .neq("status", "published");
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/staging");
  return { success: true, data: undefined };
}

/** Removes a draft row and every R2 object it owns. */
async function hardDelete(draft: DraftWithImages): Promise<Result> {
  await deleteObjects("originals", draft.images.map((i) => i.original_key).filter((k): k is string => !!k));
  await deleteObjects(
    "media",
    draft.images.flatMap((i) => [i.cutout_key, i.cutout_web_key]).filter((k): k is string => !!k),
  );
  const { error } = await staging().from("product_drafts").delete().eq("id", draft.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/staging");
  return { success: true, data: undefined };
}

/** Hard delete a discarded draft and its R2 objects (owner-triggered only). */
export async function purgeDraft(id: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const draft = await getDraft(id);
  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status !== "discarded") return { success: false, error: "Only discarded drafts can be purged" };
  return hardDelete(draft);
}

/** Permanently deletes any draft that is not published (explicit user action from the staging menu). */
export async function deleteDraft(id: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const draft = await getDraft(id);
  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status === "published") return { success: false, error: "No se puede eliminar un producto publicado" };
  return hardDelete(draft);
}

/** Deletes capturing drafts that never got any data (leftovers from before drafts were created lazily). */
export async function purgeEmptyDrafts(): Promise<Result<{ deleted: number }>> {
  if (!(await getAdminUserId())) return unauthorized;
  const { data, error } = await staging()
    .from("product_drafts")
    .select("id")
    .eq("status", "capturing")
    .is("name", null)
    .is("brand", null)
    .is("size", null)
    .is("price", null)
    .is("transcript", null);
  if (error) return { success: false, error: error.message };

  let deleted = 0;
  for (const { id } of data ?? []) {
    const draft = await getDraft(id);
    if (!draft || draft.images.length > 0) continue;
    if ((await hardDelete(draft)).success) deleted++;
  }
  return { success: true, data: { deleted } };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/**
 * Reserves the next image row for a draft (called before the worker uploads).
 * With a `role`, the photo takes that slot: whoever held it becomes unassigned
 * (never deleted), and a new front photo becomes the main one.
 */
export async function reserveDraftImage(draftId: string, role: ShotRole | null = null): Promise<Result<DraftImageRow>> {
  if (!(await getAdminUserId())) return unauthorized;
  const parsedRole = ShotRoleSchema.nullable().safeParse(role);
  if (!parsedRole.success) return { success: false, error: "Invalid photo role" };

  const { data: existing } = await staging()
    .from("draft_images")
    .select("position, is_main")
    .eq("draft_id", draftId)
    .order("position", { ascending: false });

  if (role && isSingleSlot(role)) {
    await staging().from("draft_images").update({ shot_role: null }).eq("draft_id", draftId).eq("shot_role", role);
  }
  const isFront = role === "front";
  if (isFront) await staging().from("draft_images").update({ is_main: false }).eq("draft_id", draftId);

  const position = (existing?.[0]?.position ?? 0) + 1;
  const { data, error } = await staging()
    .from("draft_images")
    .insert({
      draft_id: draftId,
      position,
      shot_role: role,
      is_main: isFront || !existing?.some((i) => i.is_main),
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Insert failed" };
  return { success: true, data: data as DraftImageRow };
}

const ImagePatchSchema = z.object({
  status: z.enum(["pending", "processing", "done", "failed"]).optional(),
  original_key: z.string().optional(),
  cutout_key: z.string().optional(),
  cutout_web_key: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes_original: z.number().int().nonnegative().optional(),
  bytes_cutout: z.number().int().nonnegative().optional(),
  bytes_web: z.number().int().nonnegative().optional(),
  dominant_colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
  error: z.string().nullable().optional(),
});

export async function updateDraftImage(
  imageId: string,
  patch: z.infer<typeof ImagePatchSchema>,
): Promise<Result<DraftImageRow>> {
  if (!(await getAdminUserId())) return unauthorized;
  const parsed = ImagePatchSchema.safeParse(patch);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const { data, error } = await staging()
    .from("draft_images")
    .update(parsed.data)
    .eq("id", imageId)
    .select("*")
    .single();
  if (error || !data) return { success: false, error: error?.message ?? "Update failed" };

  const image = data as DraftImageRow;
  // Colors from the main image's cutout feed the draft automatically
  if (image.is_main && parsed.data.dominant_colors?.length) {
    const [main, ...secondary] = parsed.data.dominant_colors;
    await updateDraft(image.draft_id, { main_color_hex: main, secondary_colors: secondary.slice(0, 3) });
  }
  revalidatePath(`/admin/staging/${image.draft_id}`);
  return { success: true, data: image };
}

/** Makes `imageId` the main image and copies its colors onto the draft. */
async function applyMainImage(draftId: string, imageId: string): Promise<Result> {
  await staging().from("draft_images").update({ is_main: false }).eq("draft_id", draftId);
  const { data, error } = await staging()
    .from("draft_images")
    .update({ is_main: true })
    .eq("id", imageId)
    .select("dominant_colors")
    .single();
  if (error) return { success: false, error: error.message };

  const [main, ...secondary] = (data?.dominant_colors as string[] | null) ?? [];
  if (main) await updateDraft(draftId, { main_color_hex: main, secondary_colors: secondary.slice(0, 3) });
  return { success: true, data: undefined };
}

export async function setMainDraftImage(draftId: string, imageId: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const res = await applyMainImage(draftId, imageId);
  revalidatePath(`/admin/staging/${draftId}`);
  return res;
}

/**
 * Moves a photo into a slot (or back to unassigned with `null`). If the slot is
 * taken the two photos swap. Assigning `front` makes the photo the main one.
 */
export async function assignImageRole(draftId: string, imageId: string, role: ShotRole | null): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const parsedRole = ShotRoleSchema.nullable().safeParse(role);
  if (!parsedRole.success) return { success: false, error: "Invalid photo role" };

  const { data: moved } = await staging()
    .from("draft_images")
    .select("id, shot_role")
    .eq("id", imageId)
    .eq("draft_id", draftId)
    .maybeSingle();
  if (!moved) return { success: false, error: "Image not found" };
  const previousRole = moved.shot_role as ShotRole | null;
  if (previousRole === role) return { success: true, data: undefined };

  const setRole = (id: string, shot_role: ShotRole | null) =>
    staging().from("draft_images").update({ shot_role }).eq("id", id);

  const { data: occupant } =
    role && isSingleSlot(role)
      ? await staging().from("draft_images").select("id").eq("draft_id", draftId).eq("shot_role", role).maybeSingle()
      : { data: null };

  // Clear first so the partial unique index never sees two holders of one slot.
  await setRole(imageId, null);
  if (occupant) await setRole(occupant.id, previousRole);
  const { error } = await setRole(imageId, role);
  if (error) return { success: false, error: error.message };

  if (role === "front") await applyMainImage(draftId, imageId);
  revalidatePath(`/admin/staging/${draftId}`);
  return { success: true, data: undefined };
}

/** Reorders images: `orderedIds[i]` gets position i + 1. Uses a two-phase update to dodge the unique index. */
export async function reorderDraftImages(draftId: string, orderedIds: string[]): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  for (const [i, id] of orderedIds.entries()) {
    await staging().from("draft_images").update({ position: 100 + i }).eq("id", id).eq("draft_id", draftId);
  }
  for (const [i, id] of orderedIds.entries()) {
    await staging().from("draft_images").update({ position: i + 1 }).eq("id", id).eq("draft_id", draftId);
  }
  revalidatePath(`/admin/staging/${draftId}`);
  return { success: true, data: undefined };
}

export async function deleteDraftImage(imageId: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const { data: image } = await staging().from("draft_images").select("*").eq("id", imageId).maybeSingle();
  if (!image) return { success: false, error: "Image not found" };
  const img = image as DraftImageRow;

  if (img.original_key) await deleteObjects("originals", [img.original_key]);
  await deleteObjects("media", [img.cutout_key, img.cutout_web_key].filter((k): k is string => !!k));
  await staging().from("draft_images").delete().eq("id", imageId);

  if (img.is_main) {
    const { data: next } = await staging()
      .from("draft_images")
      .select("id")
      .eq("draft_id", img.draft_id)
      .order("position")
      .limit(1);
    if (next?.[0]) await setMainDraftImage(img.draft_id, next[0].id);
  }
  revalidatePath(`/admin/staging/${img.draft_id}`);
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface DraftListItem {
  id: string;
  sku: string;
  status: DraftRow["status"];
  source: DraftSource;
  name: string | null;
  brand: string | null;
  size: string | null;
  price: number | null;
  match_kind: DraftRow["match_kind"];
  subcategory_id: string | null;
  missing_fields: string[];
  updated_at: string;
  main_web_key: string | null;
  /** Finished web cutouts in display order (main first), for the full-screen viewer */
  photo_keys: string[];
  done_images: number;
  /** Nothing captured yet: no photos and no basic fields */
  is_empty: boolean;
}

export async function listDrafts(filters: { status?: string; subcategory?: string } = {}): Promise<
  Result<DraftListItem[]>
> {
  if (!(await getAdminUserId())) return unauthorized;

  let query = staging()
    .from("product_drafts")
    .select(
      "id, sku, status, source, name, brand, size, price, match_kind, subcategory_id, missing_fields, updated_at, images:draft_images(cutout_web_key, is_main, status, shot_role, position)",
    )
    .order("updated_at", { ascending: false });

  const status = DraftStatusSchema.safeParse(filters.status);
  query = status.success ? query.eq("status", status.data) : query.neq("status", "discarded");
  if (filters.subcategory) query = query.eq("subcategory_id", filters.subcategory);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  type Row = Omit<DraftListItem, "main_web_key" | "photo_keys" | "done_images" | "is_empty"> & {
    images: Pick<DraftImageRow, "cutout_web_key" | "is_main" | "status" | "shot_role" | "position">[];
  };
  return {
    success: true,
    data: (data as Row[]).map(({ images, ...d }) => {
      const finished = images
        .filter((i) => i.status === "done" && i.cutout_web_key)
        .sort(
          (a, b) =>
            Number(b.is_main) - Number(a.is_main) || roleRank(a.shot_role) - roleRank(b.shot_role) || a.position - b.position,
        );
      return {
        ...d,
        price: d.price === null ? null : Number(d.price),
        main_web_key: finished[0]?.cutout_web_key ?? null,
        photo_keys: finished.map((i) => i.cutout_web_key as string),
        done_images: finished.length,
        is_empty: images.length === 0 && !d.name && !d.brand && !d.size && d.price === null,
      };
    }),
  };
}
