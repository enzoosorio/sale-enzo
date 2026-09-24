import Link from "next/link";
import { listDrafts } from "@/actions/admin/staging";
import { NewDraftButton } from "@/components/admin/staging/NewDraftButton";

/**
 * Mobile entry point (PWA start_url). Starts a new draft or resumes one
 * still being captured.
 */
export default async function CapturePage() {
  const result = await listDrafts({ status: "capturing" });
  const inProgress = result.success ? result.data : [];

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <header className="pt-2">
          <h1 className="text-3xl font-prata text-gray-900">Capturar</h1>
          <p className="text-gray-600">Dicta el producto, toma 2–3 fotos y revisa.</p>
        </header>

        <NewDraftButton />

        {inProgress.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700">Continuar</h2>
            <ul className="space-y-2">
              {inProgress.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/staging/${d.id}`} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 bg-white">
                    <span className="truncate">{d.name ?? "Sin nombre"}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-3">
                      {d.sku} · {d.done_images} fotos
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
