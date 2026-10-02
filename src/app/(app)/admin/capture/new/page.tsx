import { notFound } from "next/navigation";
import { CaptureWizard } from "@/components/admin/capture/CaptureWizard";
import { loadExtractionContext } from "@/lib/catalog/catalogContext";
import { getDraft } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Capture wizard. Without `?d=` nothing exists yet: no draft is created until
 * the first photo, dictation or edited field. The wizard then adds `?d=<id>`
 * in place, so a reload resumes the same draft without remounting.
 */
export default async function NewCapturePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  if (d && !UUID.test(d)) notFound();

  // Admin gate lives in admin/layout.tsx; data access below uses the service role.
  const draft = d ? await getDraft(d) : null;
  if (d && !draft) notFound();

  // Not awaited: the Fotos step paints immediately and only the Producto step waits for the catalog.
  const context = loadExtractionContext(supabaseAdmin, { excludeDraftId: d });

  return <CaptureWizard draft={draft} context={context} />;
}
