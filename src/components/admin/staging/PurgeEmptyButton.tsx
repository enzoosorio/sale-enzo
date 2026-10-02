"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eraser } from "lucide-react";
import { purgeEmptyDrafts } from "@/actions/admin/staging";

/** One-click cleanup of drafts that never got any data (from before drafts were created on first input). */
export function PurgeEmptyButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Eliminar ${count} borrador${count === 1 ? "" : "es"} vacío${count === 1 ? "" : "s"}? No tienen fotos ni datos.`)) return;
        start(async () => {
          const res = await purgeEmptyDrafts();
          if (res.success) {
            toast.success(`${res.data.deleted} eliminado${res.data.deleted === 1 ? "" : "s"}`);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 disabled:opacity-50"
    >
      <Eraser className="h-4 w-4" /> Limpiar vacíos ({count})
    </button>
  );
}
