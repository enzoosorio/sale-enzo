"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import {
  computeMissingFields,
  DraftFieldsSchema,
  DraftStatusSchema,
  EMPTY_DRAFT_FIELDS,
  type DraftFields,
} from "@/lib/catalog/schema";
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
): Promise<Result<{ id: string; sku: string }>> {
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
  revalidatePath("/admin/staging");
  return { success: true, data };
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

/** Hard delete a discarded draft and its R2 objects (owner-triggered only). */
export async function purgeDraft(id: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
  const draft = await getDraft(id);
  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status !== "discarded") return { success: false, error: "Only discarded drafts can be purged" };

  await deleteObjects("originals", draft.images.map((i) => i.original_key).filter((k): k is string => !!k));
  await deleteObjects(
    "media",
    draft.images.flatMap((i) => [i.cutout_key, i.cutout_web_key]).filter((k): k is string => !!k),
  );
  const { error } = await staging().from("product_drafts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/staging");
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/** Reserves the next image slot for a draft (called before the worker uploads). */
export async function reserveDraftImage(draftId: string): Promise<Result<DraftImageRow>> {
  if (!(await getAdminUserId())) return unauthorized;

  const { data: existing } = await staging()
    .from("draft_images")
    .select("position, is_main")
    .eq("draft_id", draftId)
    .order("position", { ascending: false });

  const position = (existing?.[0]?.position ?? 0) + 1;
  const { data, error } = await staging()
    .from("draft_images")
    .insert({ draft_id: draftId, position, is_main: !existing?.some((i) => i.is_main), status: "pending" })
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

export async function setMainDraftImage(draftId: string, imageId: string): Promise<Result> {
  if (!(await getAdminUserId())) return unauthorized;
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
  done_images: number;
}

export async function listDrafts(filters: { status?: string; subcategory?: string } = {}): Promise<
  Result<DraftListItem[]>
> {
  if (!(await getAdminUserId())) return unauthorized;

  let query = staging()
    .from("product_drafts")
    .select(
      "id, sku, status, source, name, brand, size, price, match_kind, subcategory_id, missing_fields, updated_at, images:draft_images(cutout_web_key, is_main, status)",
    )
    .order("updated_at", { ascending: false });

  const status = DraftStatusSchema.safeParse(filters.status);
  query = status.success ? query.eq("status", status.data) : query.neq("status", "discarded");
  if (filters.subcategory) query = query.eq("subcategory_id", filters.subcategory);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  type Row = Omit<DraftListItem, "main_web_key" | "done_images"> & {
    images: Pick<DraftImageRow, "cutout_web_key" | "is_main" | "status">[];
  };
  return {
    success: true,
    data: (data as Row[]).map(({ images, ...d }) => ({
      ...d,
      price: d.price === null ? null : Number(d.price),
      main_web_key: images.find((i) => i.is_main)?.cutout_web_key ?? images[0]?.cutout_web_key ?? null,
      done_images: images.filter((i) => i.status === "done").length,
    })),
  };
}
