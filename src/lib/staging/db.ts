import "server-only";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import type { DraftImageRow, DraftRow, DraftWithImages } from "@/types/staging";

/**
 * Service-role access to the staging schema.
 * Callers MUST verify admin status (getAdminUserId) before using these helpers.
 */
export const staging = () => supabaseAdmin.schema("staging");

export async function getDraft(id: string): Promise<DraftWithImages | null> {
  const { data, error } = await staging()
    .from("product_drafts")
    .select("*, images:draft_images(*)")
    .eq("id", id)
    .order("position", { referencedTable: "draft_images", ascending: true })
    .maybeSingle();
  if (error) throw new Error(`getDraft: ${error.message}`);
  return data as DraftWithImages | null;
}

export async function getDraftImages(draftId: string): Promise<DraftImageRow[]> {
  const { data, error } = await staging()
    .from("draft_images")
    .select("*")
    .eq("draft_id", draftId)
    .order("position");
  if (error) throw new Error(`getDraftImages: ${error.message}`);
  return (data ?? []) as DraftImageRow[];
}

/** Category slug used as the R2 folder for a draft's images. */
export async function draftCategorySlug(draft: Pick<DraftRow, "category_id">): Promise<string> {
  if (!draft.category_id) return "uncategorized";
  const { data } = await supabaseAdmin
    .from("product_categories")
    .select("slug")
    .eq("id", draft.category_id)
    .maybeSingle();
  return data?.slug ?? "uncategorized";
}
