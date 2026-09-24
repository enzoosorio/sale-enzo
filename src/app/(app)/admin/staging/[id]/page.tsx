import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { validateForPublish } from "@/actions/admin/publish";
import { DraftActions } from "@/components/admin/staging/DraftActions";
import { DraftEditor } from "@/components/admin/staging/DraftEditor";
import { DraftPreview } from "@/components/admin/staging/DraftPreview";
import { loadExtractionContext } from "@/lib/catalog/catalogContext";
import { getDraft } from "@/lib/staging/db";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

const STATUS_LABEL: Record<string, string> = {
  capturing: "Capturando",
  pending_review: "Por revisar",
  approved: "Aprobado",
  published: "Publicado",
  discarded: "Descartado",
};

export default async function StagingDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  // Admin gate lives in admin/layout.tsx; data access below uses the service role.
  const draft = await getDraft(id);
  if (!draft) notFound();

  const [ctx, { missing, blockers }] = await Promise.all([
    loadExtractionContext(supabaseAdmin, { excludeDraftId: id }),
    validateForPublish(draft),
  ]);
  const activeTab = tab === "preview" ? "preview" : "edit";

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-5">
        <Link href="/admin/staging" className="inline-flex items-center gap-1 text-sm text-gray-600">
          <ArrowLeft className="w-4 h-4" /> Staging
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">
              {draft.sku} · {STATUS_LABEL[draft.status]} · {draft.source}
            </p>
            <h1 className="text-2xl font-prata text-gray-900">{draft.name ?? "Producto sin nombre"}</h1>
          </div>
          <DraftActions draft={draft} blockers={[...blockers, ...(missing.length ? [`Faltan: ${missing.join(", ")}`] : [])]} />
        </header>

        {(missing.length > 0 || blockers.length > 0) && draft.status !== "published" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
            {missing.length > 0 && <p>Faltan: {missing.join(", ")}</p>}
          </div>
        )}

        <nav className="flex gap-1 border-b border-gray-200">
          {[
            { key: "edit", label: "Editar" },
            { key: "preview", label: "Preview" },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.key === "edit" ? `/admin/staging/${id}` : `/admin/staging/${id}?tab=preview`}
              className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium ${
                activeTab === t.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {activeTab === "preview" ? (
          <DraftPreview draft={draft} />
        ) : (
          <DraftEditor draft={draft} taxonomy={ctx.taxonomy} brands={ctx.brands} catalog={ctx.catalog} />
        )}
      </div>
    </main>
  );
}
