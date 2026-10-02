"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Camera, ImagePlus, RotateCw, Trash2, X } from "lucide-react";
import { assignImageRole, deleteDraftImage } from "@/actions/admin/staging";
import { Section } from "@/components/admin/staging/fields";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import { EXTRA_SLOT, isSingleSlot, OPTIONAL_SLOTS, PHOTO_SLOTS, REQUIRED_SLOTS, slotLabel, type PhotoSlot } from "@/lib/capture/photoSlots";
import type { CaptureJob } from "@/lib/capture/queue";
import type { ShotRole } from "@/lib/catalog/schema";
import { mediaUrl } from "@/lib/images/media";
import type { DraftImageRow, DraftWithImages } from "@/types/staging";
import { BottomSheet } from "../BottomSheet";
import { SlotArt } from "../slotArt";

const STAGE_LABEL: Record<string, string> = {
  "upload-original": "Subiendo original",
  model: "Descargando modelo",
  "remove-bg": "Quitando fondo",
  encode: "Comprimiendo",
  "upload-cutouts": "Subiendo recortes",
};

type Item = { kind: "image"; image: DraftImageRow } | { kind: "job"; job: CaptureJob };

const CHECKER = "bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-size-[16px_16px]";

interface Props {
  draft: DraftWithImages;
  locked: boolean;
  /** Creates the draft the first time a photo is taken (nothing exists before that) */
  ensureDraft: () => Promise<string>;
  onChange: () => void;
}

/**
 * Guided photo capture. Every shot has a named slot with a placeholder showing
 * what to take; photos can also be taken in any order (unassigned) and moved
 * into their slot afterwards. Processing happens off-thread in the capture queue.
 */
export function PhotosStep({ draft, locked, ensureDraft, onChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<ShotRole | null>(null);
  const [sheetImageId, setSheetImageId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { jobs, addFiles, retry, dismiss } = useCaptureQueue(draft.id, onChange);

  // Photos taken before the draft exists wait here until its id arrives, then enter the queue.
  const waitingRef = useRef<{ files: File[]; role: ShotRole | null }[]>([]);
  useEffect(() => {
    if (!draft.id || waitingRef.current.length === 0) return;
    for (const batch of waitingRef.current.splice(0)) void addFiles(batch.files, batch.role);
  }, [draft.id, addFiles]);

  const dispatch = (files: File[], role: ShotRole | null) => {
    if (draft.id) return void addFiles(files, role);
    waitingRef.current.push({ files, role });
    ensureDraft().catch((e: unknown) => {
      waitingRef.current = [];
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la foto");
    });
  };

  const activeJobs = jobs.filter((j) => j.status !== "done");
  const jobByImage = new Map(activeJobs.filter((j) => j.imageId).map((j) => [j.imageId as string, j]));
  const jobsWithoutImage = activeJobs.filter((j) => !j.imageId);

  const itemsFor = (role: ShotRole | null): Item[] => [
    ...draft.images
      .filter((i) => i.shot_role === role)
      .map<Item>((image) => {
        const job = jobByImage.get(image.id);
        return job ? { kind: "job", job } : { kind: "image", image };
      }),
    ...jobsWithoutImage.filter((j) => (j.role ?? null) === role).map<Item>((job) => ({ kind: "job", job })),
  ];

  const pick = (role: ShotRole | null, source: "camera" | "gallery") => {
    roleRef.current = role;
    (source === "camera" ? cameraRef : galleryRef).current?.click();
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const role = roleRef.current;
    roleRef.current = null;
    if (role && isSingleSlot(role) && files.length > 1) {
      dispatch(files.slice(0, 1), role);
      dispatch(files.slice(1), null);
    } else {
      dispatch(files, role);
    }
  };

  const act = (fn: () => Promise<unknown>) => {
    setSheetImageId(null);
    startTransition(async () => {
      await fn();
      onChange();
    });
  };

  const sheetImage = draft.images.find((i) => i.id === sheetImageId) ?? null;
  const unassigned = itemsFor(null);
  const extras = itemsFor("extra");

  const renderTile = (slot: PhotoSlot, item: Item | undefined) => {
    if (!item) {
      return <EmptySlot slot={slot} disabled={locked} onCamera={() => pick(slot.role, "camera")} onGallery={() => pick(slot.role, "gallery")} />;
    }
    if (item.kind === "job") {
      return <JobTile job={item.job} label={slot.label} onRetry={() => retry(item.job.id)} onDismiss={() => dismiss(item.job.id)} />;
    }
    return <PhotoTile image={item.image} label={slot.label} disabled={locked || pending} onOpen={() => setSheetImageId(item.image.id)} />;
  };

  return (
    <div className={`space-y-10 ${pending ? "opacity-70 transition-opacity" : ""}`}>
      <Section
        title="Fotos"
        subtitle="Toca cada casilla para tomar su foto. Si prefieres, tómalas sin orden y colócalas después."
      >
        <div className="grid grid-cols-2 gap-4">
          {REQUIRED_SLOTS.map((slot) => (
            <div key={slot.role}>{renderTile(slot, itemsFor(slot.role)[0])}</div>
          ))}
        </div>
      </Section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-gray-800">
          Opcionales <span className="font-normal text-gray-500">· ayudan a vender</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {OPTIONAL_SLOTS.filter((s) => s.role !== "extra").map((slot) => (
            <div key={slot.role}>{renderTile(slot, itemsFor(slot.role)[0])}</div>
          ))}
          {extras.map((item) => (
            <div key={item.kind === "job" ? item.job.id : item.image.id}>{renderTile(EXTRA_SLOT, item)}</div>
          ))}
          {!locked && <div>{renderTile(EXTRA_SLOT, undefined)}</div>}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-gray-800">
            Sin asignar <span className="font-normal text-gray-500">· tómalas en cualquier orden</span>
          </h3>
          {!locked && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => pick(null, "camera")}
                className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-gray-900 text-white text-sm font-medium"
              >
                <Camera className="w-4 h-4" /> Tomar
              </button>
              <button
                type="button"
                onClick={() => pick(null, "gallery")}
                className="grid place-items-center h-10 w-10 rounded-xl border border-gray-200 bg-white"
                aria-label="Elegir de la galería"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {unassigned.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {unassigned.map((item) => {
              const key = item.kind === "job" ? item.job.id : item.image.id;
              const sentinel: PhotoSlot = { role: "extra", label: "Sin asignar", hint: "", required: false };
              return <div key={key}>{renderTile(sentinel, item)}</div>;
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Las fotos que tomes sin casilla aparecen aquí. Tócalas para colocarlas.</p>
        )}
      </section>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />

      <BottomSheet
        open={!!sheetImage}
        title={sheetImage?.shot_role ? `Foto: ${slotLabel(sheetImage.shot_role)}` : "¿Qué foto es?"}
        onClose={() => setSheetImageId(null)}
      >
        {sheetImage && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {PHOTO_SLOTS.filter((s) => s.role !== sheetImage.shot_role).map((slot) => {
                const taken = isSingleSlot(slot.role) && draft.images.some((i) => i.shot_role === slot.role && i.id !== sheetImage.id);
                return (
                  <button
                    key={slot.role}
                    type="button"
                    onClick={() => act(() => assignImageRole(draft.id, sheetImage.id, slot.role))}
                    className="flex flex-col items-start rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-400"
                  >
                    <span className="text-sm font-medium text-gray-900">{slot.label}</span>
                    <span className="text-xs text-gray-500">{taken ? "Intercambiar" : slot.required ? "Obligatoria" : "Opcional"}</span>
                  </button>
                );
              })}
              {sheetImage.shot_role && (
                <button
                  type="button"
                  onClick={() => act(() => assignImageRole(draft.id, sheetImage.id, null))}
                  className="flex flex-col items-start rounded-xl border border-gray-200 px-3.5 py-3 text-left hover:border-gray-400"
                >
                  <span className="text-sm font-medium text-gray-900">Sin asignar</span>
                  <span className="text-xs text-gray-500">Quitar de su casilla</span>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {sheetImage.shot_role && (
                <button
                  type="button"
                  onClick={() => {
                    setSheetImageId(null);
                    pick(sheetImage.shot_role, "camera");
                  }}
                  className="flex flex-1 items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 text-sm font-medium"
                >
                  <Camera className="w-4 h-4" /> Tomar otra
                </button>
              )}
              <button
                type="button"
                onClick={() => act(() => deleteDraftImage(sheetImage.id))}
                className="flex flex-1 items-center justify-center gap-2 h-11 rounded-xl border border-rose-200 text-sm font-medium text-rose-700"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function EmptySlot({
  slot,
  disabled,
  onCamera,
  onGallery,
}: {
  slot: PhotoSlot;
  disabled: boolean;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onCamera}
        className="flex aspect-4/5 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-3 text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-600 disabled:opacity-50"
      >
        <SlotArt role={slot.role} className="h-14 w-14" />
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
          <Camera className="h-3.5 w-3.5" /> {slot.label}
        </span>
        <span className="text-center text-xs leading-snug text-gray-500">{slot.hint}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onGallery}
        aria-label={`Elegir ${slot.label.toLowerCase()} de la galería`}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
      >
        <ImagePlus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PhotoTile({
  image,
  label,
  disabled,
  onOpen,
}: {
  image: DraftImageRow;
  label: string;
  disabled: boolean;
  onOpen: () => void;
}) {
  const src = mediaUrl(image.cutout_web_key);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      aria-label={`${label}: cambiar o mover`}
      className={`relative block aspect-4/5 w-full overflow-hidden rounded-2xl border ${CHECKER} ${
        image.shot_role === "front" ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
      }`}
    >
      {src && image.status === "done" ? (
        <Image src={src} alt={label} fill sizes="(min-width: 640px) 200px, 45vw" className="object-contain" />
      ) : (
        <span className="absolute inset-0 grid place-items-center p-2 text-center text-xs text-gray-500">
          {image.status === "failed" ? `Error: ${image.error ?? "desconocido"}` : "Procesando…"}
        </span>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-800 backdrop-blur">
        {label}
      </span>
    </button>
  );
}

function JobTile({
  job,
  label,
  onRetry,
  onDismiss,
}: {
  job: CaptureJob;
  label: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const thumb = useObjectUrl(job.file);
  const stageKey = job.stage?.split(" ")[0] ?? "";
  const percent = job.stage?.split(" ")[1];

  return (
    <div className="relative aspect-4/5 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center text-xs font-medium">
        {job.status === "failed" ? (
          <>
            <span className="line-clamp-3 rounded bg-white/85 px-1 text-rose-700">{job.error}</span>
            <div className="flex gap-2">
              <button type="button" onClick={onRetry} className="rounded-lg bg-white p-2 shadow" aria-label="Reintentar">
                <RotateCw className="h-4 w-4" />
              </button>
              <button type="button" onClick={onDismiss} className="rounded-lg bg-white p-2 shadow" aria-label="Descartar">
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
            <span className="rounded bg-white/85 px-1.5 py-0.5">
              {job.status === "queued" ? "En cola" : (STAGE_LABEL[stageKey] ?? "Procesando")} {percent ?? ""}
            </span>
          </>
        )}
      </div>
      <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-800 backdrop-blur">
        {label}
      </span>
    </div>
  );
}

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
