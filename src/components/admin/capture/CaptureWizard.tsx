"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, Loader2, Rocket } from "lucide-react";
import { createDraft, updateDraft, type DraftUpdate } from "@/actions/admin/staging";
import type { FieldTone } from "@/components/admin/staging/fields";
import { blankDraft, isSaved } from "@/lib/capture/blankDraft";
import { parseStep, STEP_FIELDS, stepStatus, WIZARD_STEPS, type StepKey, type StepStatus } from "@/lib/capture/wizardSteps";
import { MIN_DONE_IMAGES, type DraftFields } from "@/lib/catalog/schema";
import { orderedDoneImages } from "@/lib/staging/draftToPreview";
import type { DraftWithImages } from "@/types/staging";
import { MoreMenu } from "./MoreMenu";
import { PhotosStep } from "./steps/PhotosStep";
import { PriceStep } from "./steps/PriceStep";
import { ProductStep } from "./steps/ProductStep";
import { ReviewStep } from "./steps/ReviewStep";
import { VariantStep } from "./steps/VariantStep";
import type { CaptureContext, StepProps } from "./types";
import { useDraftActions } from "./useDraftActions";
import { VoiceFab } from "./VoiceFab";
import { WizardStepper } from "./WizardStepper";

gsap.registerPlugin(useGSAP);

/** What the voice toast calls each field it just filled in. */
const CHANGE_LABEL: Partial<Record<keyof DraftFields, string>> = {
  name: "nombre",
  brand: "marca",
  subcategory_id: "categoría",
  size: "talla",
  gender: "género",
  fit: "fit",
  fits_like_min: "calce",
  metadata: "detalles",
  tags: "tags",
  condition_score: "estado",
  price: "precio",
  defects: "defectos",
};

const stepOfField = (key: string): StepKey | undefined =>
  (Object.keys(STEP_FIELDS) as (keyof typeof STEP_FIELDS)[]).find((s) => STEP_FIELDS[s].includes(key));

interface Props {
  /** null = nothing exists yet; the draft is created on the first real input */
  draft: DraftWithImages | null;
  context: Promise<CaptureContext>;
}

/** Updates query params in place (no navigation, no remount). */
function setUrlParams(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.history.replaceState(null, "", url.pathname + url.search);
}

/**
 * Step-by-step capture: Fotos → Producto → Variante → Precio → Revisar.
 * Nothing is flagged as missing until you've passed a step, navigation is never
 * blocked, and the dictation button stays reachable on every step.
 * Opening the wizard creates nothing: the draft row appears with the first photo,
 * dictation or edited field (see ensureDraft).
 */
export function CaptureWizard({ draft: initial, context }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Server re-renders hand us a fresh promise after every save; keep the first (already resolved) one.
  const [contextPromise] = useState(context);
  const [draft, setDraft] = useState<DraftWithImages>(() => initial ?? blankDraft());
  const [saving, startSaving] = useTransition();
  const [warnings, setWarnings] = useState<string[]>(
    ((initial?.ai_raw as { warnings?: string[] } | null)?.warnings ?? []).filter(Boolean),
  );
  const locked = draft.status === "published" || draft.status === "discarded";
  const startsInReview = !!initial && initial.status !== "capturing";

  const [step, setStep] = useState<StepKey>(() => parseStep(searchParams.get("step")) ?? (startsInReview ? "review" : "photos"));
  const [seen, setSeen] = useState<ReadonlySet<StepKey>>(() => new Set(startsInReview ? WIZARD_STEPS.map((s) => s.key) : []));
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Server refresh (router.refresh after photo processing) replaces local state
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) setDraft(initial);
  }

  const { pending: publishing, publish } = useDraftActions(draft);

  const doneImages = orderedDoneImages(draft.images).length;
  const statuses = useMemo(
    () =>
      Object.fromEntries(WIZARD_STEPS.map((s) => [s.key, stepStatus(s.key, draft.missing_fields, doneImages)])) as Record<
        StepKey,
        StepStatus
      >,
    [draft.missing_fields, doneImages],
  );
  const canPublish = !locked && draft.missing_fields.length === 0 && doneImages >= MIN_DONE_IMAGES;

  const goTo = useCallback(
    (next: StepKey) => {
      if (next === step) return;
      // Leaving a step reveals what it lacked; arriving from Revisar reveals the target (the checklist just named it).
      setSeen((prev) => new Set([...prev, step, ...(step === "review" ? [next] : [])]));
      setStep(next);
      setUrlParams({ step: next });
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [step],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(contentRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", clearProps: "transform,opacity" });
      });
      return () => mm.revert();
    },
    { dependencies: [step], scope: contentRef },
  );

  const tone = useCallback(
    (key: string): FieldTone => {
      if (draft.missing_fields.includes(key)) {
        const owner = stepOfField(key);
        return owner && seen.has(owner) ? "missing" : "ok";
      }
      const confidenceKey = key === "condition_score" ? key : key.replace(/_id$/, "");
      return (draft.field_confidence[confidenceKey] ?? 1) < 0.6 ? "uncertain" : "ok";
    },
    [draft.missing_fields, draft.field_confidence, seen],
  );

  /** Creates the draft row the first time something real happens; later calls reuse it. */
  const creatingRef = useRef<Promise<string> | null>(null);
  const ensureDraft = useCallback(async (): Promise<string> => {
    if (draftRef.current.id) return draftRef.current.id;
    creatingRef.current ??= (async () => {
      const res = await createDraft("voice", { match_kind: "new_product" });
      if (!res.success) {
        creatingRef.current = null;
        throw new Error(res.error);
      }
      const { id, sku, draft: created } = res.data;
      draftRef.current = { ...draftRef.current, id, sku };
      // Identity only: keep what was typed locally; the pending save returns the merged row.
      setDraft((d) => ({ ...d, id, sku, created_at: created.created_at, updated_at: created.updated_at }));
      setUrlParams({ d: id });
      return id;
    })();
    return creatingRef.current;
  }, []);

  const save = useCallback(
    (patch: DraftUpdate) => {
      setDraft((d) => ({ ...d, ...patch }) as DraftWithImages);
      startSaving(async () => {
        try {
          const id = await ensureDraft();
          const res = await updateDraft(id, patch);
          if (res.success) setDraft(res.data);
          else toast.error(res.error);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo guardar");
        }
      });
    },
    [ensureDraft],
  );
  const set = useCallback(
    <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => save({ [key]: value } as DraftUpdate),
    [save],
  );

  const onVoiceDraft = useCallback((next: DraftWithImages, nextWarnings: string[]) => {
    const prev = draftRef.current;
    const filled = (Object.keys(CHANGE_LABEL) as (keyof DraftFields)[])
      .filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]))
      .map((k) => CHANGE_LABEL[k]);
    setDraft(next);
    setWarnings(nextWarnings);
    if (filled.length) toast.success(`Listo: ${filled.join(", ")}`);
    else toast("No encontré datos nuevos en el dictado.");
    if (nextWarnings.length) toast(`${nextWarnings.length} aviso(s) para revisar en el último paso`, { icon: "⚠️" });
  }, []);

  const saved = isSaved(draft);
  const stepProps: StepProps = { draft, locked, tone, save, set, ensureDraft };
  const index = WIZARD_STEPS.findIndex((s) => s.key === step);
  const prevStep = WIZARD_STEPS[index - 1];
  const nextStep = WIZARD_STEPS[index + 1];

  return (
    <div className="fixed inset-0 z-40 flex min-h-0 min-w-0 flex-col bg-gray-50 md:static md:z-auto md:flex-1">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 py-2">
          <Link href="/admin/staging" aria-label="Volver a Staging" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-700 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">
              {saved ? draft.sku : "Nuevo producto"} ·{" "}
              <span aria-live="polite">{saving ? "Guardando…" : saved ? "Guardado" : "Aún sin guardar"}</span>
            </p>
            <p className="truncate text-sm font-medium text-gray-900">{draft.name ?? "Producto sin nombre"}</p>
          </div>
          {saved && <MoreMenu draft={draft} />}
        </div>
        <WizardStepper current={step} statuses={statuses} onSelect={goTo} />
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div ref={contentRef} className="mx-auto w-full max-w-xl px-5 pb-36 pt-8">
            {step === "photos" && <PhotosStep draft={draft} locked={locked} ensureDraft={ensureDraft} onChange={() => router.refresh()} />}
            {step === "product" && (
              <Suspense fallback={<StepSkeleton />}>
                <ProductStep {...stepProps} context={contextPromise} />
              </Suspense>
            )}
            {step === "variant" && <VariantStep {...stepProps} />}
            {step === "price" && <PriceStep {...stepProps} />}
            {step === "review" && <ReviewStep draft={draft} warnings={warnings} goTo={goTo} />}
          </div>
        </div>
        {!locked && step !== "review" && <VoiceFab draftId={draft.id} onDraft={onVoiceDraft} ensureDraft={ensureDraft} />}
      </div>

      <footer className="border-t border-gray-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-5">
          {prevStep ? (
            <button
              type="button"
              onClick={() => goTo(prevStep.key)}
              className="flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          ) : (
            <span />
          )}
          {nextStep ? (
            <button
              type="button"
              onClick={() => goTo(nextStep.key)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-medium text-white"
            >
              Siguiente: {nextStep.label} <ArrowRight className="h-4 w-4" />
            </button>
          ) : draft.status === "published" ? (
            <button
              type="button"
              // full load on purpose: a clean wizard, no leftover state from this product
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
              onClick={() => window.location.assign("/admin/capture/new")}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-gray-900 text-sm font-medium text-white"
            >
              Capturar otro producto
            </button>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={!canPublish || publishing}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-medium text-white disabled:opacity-40"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {publishing ? "Publicando…" : canPublish ? "Publicar" : "Completa los pasos para publicar"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export function StepSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="h-6 w-40 rounded bg-gray-200" />
      <div className="h-12 rounded-xl bg-gray-200" />
      <div className="h-12 rounded-xl bg-gray-200" />
      <div className="h-12 rounded-xl bg-gray-200" />
    </div>
  );
}
