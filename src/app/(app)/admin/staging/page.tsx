import Link from "next/link";
import { Camera } from "lucide-react";
import { listDrafts } from "@/actions/admin/staging";
import { DraftCard } from "@/components/admin/staging/DraftCard";
import { PublishReadyButton } from "@/components/admin/staging/PublishReadyButton";
import { PurgeEmptyButton } from "@/components/admin/staging/PurgeEmptyButton";
import { MIN_DONE_IMAGES } from "@/lib/catalog/schema";

const FILTERS = [
  { key: "", label: "Activos" },
  { key: "capturing", label: "Capturando" },
  { key: "pending_review", label: "Por revisar" },
  { key: "published", label: "Publicados" },
  { key: "discarded", label: "Descartados" },
];

export default async function StagingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const result = await listDrafts({ status });
  const drafts = result.success ? result.data : [];
  const ready = drafts.filter(
    (d) => d.status !== "published" && d.missing_fields.length === 0 && d.done_images >= MIN_DONE_IMAGES,
  );

  const empties = drafts.filter((d) => d.is_empty && d.status === "capturing");

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-1">Staging</h1>
            <p className="text-gray-600">Borradores por revisar antes de publicarlos en la tienda ({drafts.length})</p>
          </div>
          <div className="flex gap-2">
            {empties.length > 0 && <PurgeEmptyButton count={empties.length} />}
            {ready.length > 0 && <PublishReadyButton ids={ready.map((d) => d.id)} />}
            <Link href="/admin/capture/new" className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg">
              <Camera className="w-5 h-5" /> Capturar
            </Link>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key ? `/admin/staging?status=${f.key}` : "/admin/staging"}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${
                status === f.key ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {!result.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{result.error}</div>
        )}

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </ul>
        {drafts.length === 0 && result.success && <p className="text-gray-500">No hay borradores aquí.</p>}
      </div>
    </main>
  );
}
