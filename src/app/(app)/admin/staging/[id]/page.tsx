import { notFound } from "next/navigation";
import { CaptureWizard } from "@/components/admin/capture/CaptureWizard";
import { loadExtractionContext } from "@/lib/catalog/catalogContext";
import { getDraft } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

export default async function StagingDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Admin gate lives in admin/layout.tsx; data access below uses the service role.
  const draft = await getDraft(id);
  if (!draft) notFound();

  // Not awaited: the Fotos step paints immediately and only the Producto step waits for the catalog.
  const context = loadExtractionContext(supabaseAdmin, { excludeDraftId: id });

  return <CaptureWizard draft={draft} context={context} />;
}
