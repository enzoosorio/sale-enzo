"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ClipboardCopy, Download, Loader2, MoreHorizontal } from "lucide-react";
import type { DraftWithImages } from "@/types/staging";
import { useDraftActions } from "./useDraftActions";

/** Secondary actions, named for what they do. Publishing lives in the Revisar step. */
export function MoreMenu({ draft }: { draft: DraftWithImages }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pending, downloading, discard, downloadOriginals, copyMarketplace } = useDraftActions(draft);
  const canDiscard = draft.status !== "published" && draft.status !== "discarded";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 disabled:opacity-40";
  const run = (fn: () => void | Promise<void>) => () => {
    setOpen(false);
    void fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Más acciones"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full text-gray-700 hover:bg-gray-100"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" className={item} onClick={run(copyMarketplace)}>
            <ClipboardCopy className="h-4 w-4 text-gray-500" />
            <span>
              Copiar texto para Marketplace
              <span className="block text-xs text-gray-500">Título, precio y descripción listos para pegar</span>
            </span>
          </button>
          <button type="button" role="menuitem" className={item} disabled={downloading || draft.images.length === 0} onClick={run(downloadOriginals)}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : <Download className="h-4 w-4 text-gray-500" />}
            <span>
              Descargar fotos originales
              <span className="block text-xs text-gray-500">Las fotos sin recortar</span>
            </span>
          </button>
          {canDiscard && (
            <button type="button" role="menuitem" className={`${item} text-rose-700`} disabled={pending} onClick={run(discard)}>
              <Archive className="h-4 w-4" />
              Descartar este producto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
