"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { mediaUrl } from "@/lib/images/media";

/** Full-screen gallery for a draft's finished photos. Arrows and Escape work from the keyboard. */
export function PhotoViewer({ keys, title, onClose }: { keys: string[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const go = (delta: number) => setIndex((i) => (i + delta + keys.length) % keys.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + keys.length) % keys.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % keys.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys.length, onClose]);

  const src = mediaUrl(keys[index]);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${title}`} className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="truncate text-sm">
          {title} · {index + 1}/{keys.length}
        </p>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={onClose}>
        {src && <Image src={src} alt={`${title}, foto ${index + 1}`} fill sizes="100vw" className="object-contain p-4" priority />}
      </div>
      {keys.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Foto siguiente" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
