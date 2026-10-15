"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Loader2, RotateCw, Sparkles } from "lucide-react";
import { decideIroned } from "@/actions/admin/staging";
import type { PhotoRetouch } from "@/hooks/usePhotoRetouch";
import type { CutoutReason } from "@/lib/capture/imageOps";
import type { IronCheckReason } from "@/lib/capture/ironCheck";
import { mediaUrlStamped } from "@/lib/images/media";
import { ironBlockReason, MAX_IRON_GENERATIONS } from "@/lib/retouch/rules";
import type { DraftImageRow } from "@/types/staging";

gsap.registerPlugin(useGSAP);

type Tab = "original" | "cutout" | "ironed";

export const CUTOUT_REASON_LABEL: Record<CutoutReason, string> = {
  empty: "No se detectó la prenda",
  tiny: "La prenda quedó muy pequeña",
  nothing_removed: "No se quitó el fondo",
  mostly_kept: "Casi todo el fondo sigue ahí",
  touches_edges: "La prenda toca los bordes",
  fragmented: "Quedaron restos sueltos",
  soft_mask: "Bordes borrosos o con sombra",
};

const IRON_REASON_LABEL: Record<IronCheckReason, string> = {
  aspect: "La silueta cambió",
  palette: "Los colores cambiaron",
  cutout: "El recorte de la planchada es dudoso",
};

const STAGE_LABEL = { generating: "Planchando con IA…", processing: "Quitando fondo…", saving: "Guardando…" } as const;

const CHECKER = "bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-size-[16px_16px]";

interface Props {
  image: DraftImageRow;
  locked: boolean;
  retouch: PhotoRetouch;
  onChange: () => void;
}

/**
 * Before / after for one photo: the untouched original, the plain cutout and the
 * AI-ironed cutout, with the automatic checks and the owner's decision. The
 * ironed version only ships once accepted here.
 */
export function PhotoCompare({ image, locked, retouch, onChange }: Props) {
  // The owner's pick only holds for the current generation: a new ironing resets the view to "what to look at next".
  const [pick, setPick] = useState<{ tab: Tab; version: number } | null>(null);
  const tab: Tab = pick && pick.version === image.ironed_version ? pick.tab : image.ironed_status === "ready" ? "ironed" : "cutout";
  const setTab = (t: Tab) => setPick({ tab: t, version: image.ironed_version });
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalError, setOriginalError] = useState(false);
  const [deciding, startDecide] = useTransition();
  const stageRef = useRef<HTMLDivElement>(null);

  const mine = retouch.busy?.imageId === image.id ? retouch.busy : null;
  const busy = retouch.busy !== null;
  const hasIroned = !!image.ironed_web_key && ["ready", "accepted", "rejected"].includes(image.ironed_status);
  const blocked = ironBlockReason(image);
  const left = Math.max(0, MAX_IRON_GENERATIONS - image.ironed_version);

  // The signed URL is minted only when the owner asks to see the original.
  useEffect(() => {
    if (tab !== "original" || originalUrl || originalError) return;
    let cancelled = false;
    fetch(`/api/admin/r2/original?imageId=${image.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { url: string }) => !cancelled && setOriginalUrl(body.url))
      .catch(() => !cancelled && setOriginalError(true));
    return () => {
      cancelled = true;
    };
  }, [tab, image.id, originalUrl, originalError]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(stageRef.current, { opacity: 0.25 }, { opacity: 1, duration: 0.22, ease: "power2.out", clearProps: "opacity" });
      });
      return () => mm.revert();
    },
    { dependencies: [tab], scope: stageRef },
  );

  const stamp = `${image.bytes_web ?? ""}-${image.bg_provider ?? ""}`;
  const src =
    tab === "original"
      ? originalUrl
      : tab === "ironed"
        ? mediaUrlStamped(image.ironed_web_key, `v${image.ironed_version}`)
        : mediaUrlStamped(image.cutout_web_key, stamp);

  const decide = (decision: "accepted" | "rejected") =>
    startDecide(async () => {
      await decideIroned(image.id, decision);
      onChange();
    });

  const tabs: { key: Tab; label: string; disabled: boolean }[] = [
    { key: "original", label: "Original", disabled: !image.original_key },
    { key: "cutout", label: "Recorte", disabled: !image.cutout_web_key },
    { key: "ironed", label: "Planchada", disabled: !hasIroned },
  ];
  const cutoutReasons = image.cutout_quality?.verdict !== "ok" ? (image.cutout_quality?.reasons ?? []) : [];

  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            disabled={t.disabled}
            onClick={() => setTab(t.key)}
            className={`h-9 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
            }`}
          >
            {t.label}
            {t.key === "ironed" && image.ironed_status === "accepted" && " ✓"}
          </button>
        ))}
      </div>

      <div ref={stageRef} className={`relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-gray-200 ${tab === "original" ? "bg-gray-50" : CHECKER}`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- compare view must show the exact stored file, unoptimized
          <img src={src} alt={tab} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-gray-500">
            {tab === "original" && originalError ? "No se pudo cargar el original" : "Cargando…"}
          </span>
        )}
        {mine && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-medium text-gray-800" aria-live="polite">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {mine.kind === "recut" && mine.stage === "processing" ? "Rehaciendo el fondo…" : STAGE_LABEL[mine.stage]}
            </span>
          </div>
        )}
      </div>

      {(cutoutReasons.length > 0 || image.needs_review) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Revisa el recorte{image.bg_provider ? ` (${image.bg_provider === "replicate" ? "BiRefNet" : "en el dispositivo"})` : ""}</p>
          {cutoutReasons.length > 0 && (
            <ul className="mt-0.5 list-inside list-disc">
              {(cutoutReasons as CutoutReason[]).map((r) => (
                <li key={r}>{CUTOUT_REASON_LABEL[r] ?? r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasIroned && image.ironed_check && image.ironed_check.verdict !== "ok" && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            image.ironed_check.verdict === "failed" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-medium">La IA pudo haber cambiado la prenda</p>
          <ul className="mt-0.5 list-inside list-disc">
            {(image.ironed_check.reasons as IronCheckReason[]).map((r) => (
              <li key={r}>{IRON_REASON_LABEL[r] ?? r}</li>
            ))}
          </ul>
          <p className="mt-1">Compárala con el recorte antes de usarla.</p>
        </div>
      )}

      {retouch.error && (
        <p className="text-sm text-rose-600" role="alert">
          {retouch.error}
        </p>
      )}

      {!locked && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy || blocked !== null}
            onClick={() => void retouch.iron(image)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-medium text-white disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" /> {image.ironed_version === 0 ? "Planchar con IA" : "Planchar de nuevo"}
          </button>
          <p className="text-xs text-gray-500">
            {blocked ?? `Cada intento se cobra al proveedor. Te quedan ${left}. El original y el recorte no se tocan.`}
          </p>

          {hasIroned &&
            (image.ironed_status === "accepted" ? (
              <button
                type="button"
                disabled={deciding}
                onClick={() => decide("rejected")}
                className="h-11 w-full rounded-xl border border-gray-200 text-sm font-medium disabled:opacity-40"
              >
                Volver al recorte sin planchar
              </button>
            ) : (
              <button
                type="button"
                disabled={deciding}
                onClick={() => decide("accepted")}
                className="h-11 w-full rounded-xl border border-gray-900 text-sm font-medium text-gray-900 disabled:opacity-40"
              >
                Usar la versión planchada
              </button>
            ))}

          <button
            type="button"
            disabled={busy || !image.original_key}
            onClick={() => void retouch.recut(image)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm text-gray-700 disabled:opacity-40"
          >
            <RotateCw className="h-4 w-4" /> Rehacer fondo con BiRefNet
          </button>
        </div>
      )}
    </div>
  );
}
