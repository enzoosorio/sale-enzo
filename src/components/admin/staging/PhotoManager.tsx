"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, RotateCw, Star, Trash2, X } from "lucide-react";
import { deleteDraftImage, reorderDraftImages, setMainDraftImage } from "@/actions/admin/staging";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import { mediaUrl } from "@/lib/images/media";
import type { DraftImageRow } from "@/types/staging";

const STAGE_LABEL: Record<string, string> = {
  "upload-original": "Subiendo original",
  model: "Descargando modelo",
  "remove-bg": "Quitando fondo",
  encode: "Comprimiendo",
  "upload-cutouts": "Subiendo recortes",
};

interface Props {
  draftId: string;
  images: DraftImageRow[];
  onChange: () => void;
  disabled?: boolean;
}

/**
 * Photo capture + management. Native camera via <input capture> (full-res
 * HEIC→JPEG with iOS processing), processing off-thread, UI only renders
 * thumbnails and statuses.
 */
export function PhotoManager({ draftId, images, onChange, disabled }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const { jobs, addFiles, retry, dismiss } = useCaptureQueue(draftId, onChange);

  const activeJobs = jobs.filter((j) => j.status !== "done");

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void addFiles(files);
  };

  const act = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      onChange();
    });

  const move = (index: number, delta: number) => {
    const ids = images.map((i) => i.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    act(() => reorderDraftImages(draftId, ids));
  };

  return (
    <section className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gray-900 text-white font-medium disabled:opacity-40"
        >
          <Camera className="w-5 h-5" /> Tomar foto
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-gray-300 bg-white disabled:opacity-40"
          aria-label="Elegir de la galería"
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((img, index) => {
          const src = mediaUrl(img.cutout_web_key);
          return (
            <figure
              key={img.id}
              className={`relative aspect-4/5 rounded-lg overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-size-[16px_16px] border ${
                img.is_main ? "border-gray-900 ring-2 ring-gray-900" : "border-gray-200"
              }`}
            >
              {src && img.status === "done" ? (
                <Image src={src} alt={`Foto ${img.position}`} fill sizes="200px" className="object-contain" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-xs text-gray-500 p-2 text-center">
                  {img.status === "failed" ? `Error: ${img.error ?? "desconocido"}` : "Procesando…"}
                </div>
              )}
              <figcaption className="absolute inset-x-0 bottom-0 flex justify-between bg-white/85 backdrop-blur px-1 py-1">
                <button type="button" onClick={() => move(index, -1)} disabled={pending || index === 0} aria-label="Mover a la izquierda" className="p-1 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => act(() => setMainDraftImage(draftId, img.id))} disabled={pending || img.is_main} aria-label="Marcar como principal" className="p-1">
                  <Star className={`w-4 h-4 ${img.is_main ? "fill-gray-900" : ""}`} />
                </button>
                <button type="button" onClick={() => act(() => deleteDraftImage(img.id))} disabled={pending} aria-label="Eliminar foto" className="p-1 text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={pending || index === images.length - 1} aria-label="Mover a la derecha" className="p-1 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </figcaption>
            </figure>
          );
        })}

        {activeJobs.map((job) => (
          <JobTile key={job.id} job={job} onRetry={() => retry(job.id)} onDismiss={() => dismiss(job.id)} />
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Se guardan 3 versiones: original intacta (privada), recorte sin fondo en resolución completa y recorte web comprimido.
      </p>
    </section>
  );
}

function JobTile({
  job,
  onRetry,
  onDismiss,
}: {
  job: ReturnType<typeof useCaptureQueue>["jobs"][number];
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const thumb = useObjectUrl(job.file);
  const stageKey = job.stage?.split(" ")[0] ?? "";
  const percent = job.stage?.split(" ")[1];

  return (
    <div className="relative aspect-4/5 rounded-lg overflow-hidden border border-dashed border-gray-300">
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center text-xs font-medium">
        {job.status === "failed" ? (
          <>
            <span className="text-red-700 line-clamp-3">{job.error}</span>
            <div className="flex gap-2">
              <button type="button" onClick={onRetry} className="p-1.5 rounded bg-white shadow" aria-label="Reintentar">
                <RotateCw className="w-4 h-4" />
              </button>
              <button type="button" onClick={onDismiss} className="p-1.5 rounded bg-white shadow" aria-label="Descartar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <span className="bg-white/80 rounded px-1">
              {job.status === "queued" ? "En cola" : (STAGE_LABEL[stageKey] ?? "Procesando")} {percent ?? ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
