"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Rocket } from "lucide-react";
import { publishDrafts } from "@/actions/admin/publish";

/** Publishes every complete draft, parents before their sibling variants. */
export function PublishReadyButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = () => {
    if (!confirm(`¿Publicar ${ids.length} borrador(es) completos?`)) return;
    start(async () => {
      const results = await publishDrafts(ids);
      const failed = results.filter((r) => !r.result.success);
      toast[failed.length ? "error" : "success"](
        `${results.length - failed.length} publicados${failed.length ? `, ${failed.length} con error` : ""}`,
      );
      router.refresh();
    });
  };

  return (
    <button type="button" onClick={run} disabled={pending} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-900 text-gray-900 disabled:opacity-40">
      <Rocket className="w-5 h-5" /> {pending ? "Publicando…" : `Publicar listos (${ids.length})`}
    </button>
  );
}
