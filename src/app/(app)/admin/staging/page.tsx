import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { listDrafts } from "@/actions/admin/staging";
import { PublishReadyButton } from "@/components/admin/staging/PublishReadyButton";
import { MIN_DONE_IMAGES } from "@/lib/catalog/schema";
import { mediaUrl } from "@/lib/images/media";

const FILTERS = [
  { key: "", label: "Activos" },
  { key: "capturing", label: "Capturando" },
  { key: "pending_review", label: "Por revisar" },
  { key: "published", label: "Publicados" },
  { key: "discarded", label: "Descartados" },
];

const MATCH_SHORT: Record<string, string> = { new_product: "Producto", new_variant: "Variante", new_item: "Unidad" };

export default async function StagingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const result = await listDrafts({ status });
  const drafts = result.success ? result.data : [];
  const ready = drafts.filter(
    (d) => d.status !== "published" && d.missing_fields.length === 0 && d.done_images >= MIN_DONE_IMAGES,
  );

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-prata font-bold text-gray-900 mb-1">Staging</h1>
            <p className="text-gray-600">Borradores por revisar antes de publicarlos en la tienda ({drafts.length})</p>
          </div>
          <div className="flex gap-2">
            {ready.length > 0 && <PublishReadyButton ids={ready.map((d) => d.id)} />}
            <Link href="/admin/capture" className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg">
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
          {drafts.map((d) => {
            const thumb = mediaUrl(d.main_web_key);
            const complete = d.missing_fields.length === 0 && d.done_images >= MIN_DONE_IMAGES;
            return (
              <li key={d.id}>
                <Link href={`/admin/staging/${d.id}`} className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-400">
                  <div className="relative w-20 h-24 shrink-0 rounded-md overflow-hidden bg-gray-100">
                    {thumb ? (
                      <Image src={thumb} alt="" fill sizes="80px" className="object-contain" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-xs text-gray-400">Sin foto</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-gray-500">
                      {d.sku} · {d.match_kind ? MATCH_SHORT[d.match_kind] : "Sin segmentar"}
                    </p>
                    <p className="font-medium text-gray-900 line-clamp-2">{d.name ?? "Sin nombre"}</p>
                    <p className="text-sm text-gray-600">
                      {[d.brand, d.size, d.price ? `S/ ${d.price}` : null].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {d.status === "published" ? (
                        <Badge tone="green">Publicado</Badge>
                      ) : complete ? (
                        <Badge tone="green">Listo</Badge>
                      ) : (
                        <>
                          {d.done_images < MIN_DONE_IMAGES && <Badge tone="red">{d.done_images}/{MIN_DONE_IMAGES} fotos</Badge>}
                          {d.missing_fields.length > 0 && <Badge tone="red">Faltan {d.missing_fields.length}</Badge>}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        {drafts.length === 0 && result.success && <p className="text-gray-500">No hay borradores aquí.</p>}
      </div>
    </main>
  );
}

function Badge({ tone, children }: { tone: "green" | "red"; children: React.ReactNode }) {
  const cls = tone === "green" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700";
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}
