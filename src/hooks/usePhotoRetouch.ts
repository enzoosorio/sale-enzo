"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateDraftImage } from "@/actions/admin/staging";
import { bgProviders } from "@/lib/bg/types";
import { compareIroned } from "@/lib/capture/ironCheck";
import { runWorkerJob } from "@/lib/capture/runWorkerJob";
import type { DraftImageRow } from "@/types/staging";
import { createImageWorker } from "@/workers/createImageWorker";
import type { PresignedUpload } from "@/workers/image.worker";

export type RetouchKind = "iron" | "recut";
export type RetouchStage = "generating" | "processing" | "saving";

export interface RetouchBusy {
  imageId: string;
  kind: RetouchKind;
  stage: RetouchStage;
}

/**
 * On-demand edits of one stored photo, one at a time:
 *  - iron:  original → /api/admin/retouch (AI) → same worker + quality gate → versioned renditions
 *  - recut: original → worker with the server model (BiRefNet) → replaces the cutout
 * Nothing ships until the owner decides; both leave the plain photo intact.
 */
export function usePhotoRetouch(draftId: string, onDone: () => void) {
  const [busy, setBusy] = useState<RetouchBusy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const presign = useCallback(
    async (image: DraftImageRow, kinds: string[]): Promise<PresignedUpload[]> => {
      const res = await fetch("/api/admin/r2/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId, position: image.position, kinds, imageId: image.id }),
      });
      if (!res.ok) throw new Error(`presign ${res.status}`);
      return ((await res.json()) as { uploads: PresignedUpload[] }).uploads;
    },
    [draftId],
  );

  /** One worker per edit: edits are rare, and a fresh worker can't be left in a bad state by the last one. */
  const withWorker = useCallback(async <T,>(fn: (worker: Worker) => Promise<T>): Promise<T> => {
    const worker = createImageWorker();
    try {
      return await fn(worker);
    } finally {
      worker.terminate();
    }
  }, []);

  const guard = useCallback(
    async (run: () => Promise<void>) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setError(null);
      try {
        await run();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        runningRef.current = false;
        setBusy(null);
        onDoneRef.current();
      }
    },
    [],
  );

  const iron = useCallback(
    (image: DraftImageRow) =>
      guard(async () => {
        const stage = (s: RetouchStage) => setBusy({ imageId: image.id, kind: "iron", stage: s });
        stage("generating");
        const res = await fetch("/api/admin/retouch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draftId, imageId: image.id }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `No se pudo planchar (${res.status})`);
        }
        const ironedJpeg = await res.blob();

        // The generation is already paid for: whatever fails from here must not look like "never tried".
        try {
          stage("processing");
          const uploads = await presign(image, ["ironed", "ironed-web"]);
          const done = await withWorker((worker) =>
            runWorkerJob(worker, { jobId: crypto.randomUUID(), mode: "ironed", file: ironedJpeg, uploads, providers: bgProviders() }, () => undefined),
          );
          if (done.mode !== "ironed") throw new Error("Unexpected worker result");
          const { result } = done;

          stage("saving");
          const check = compareIroned(
            { width: image.width ?? result.width, height: image.height ?? result.height, colors: image.dominant_colors },
            { width: result.width, height: result.height, colors: result.dominant_colors },
            result.cutout_quality.verdict,
          );
          const saved = await updateDraftImage(image.id, {
            ironed_status: "ready",
            ironed_key: result.ironed_key,
            ironed_web_key: result.ironed_web_key,
            ironed_check: check,
          });
          if (!saved.success) throw new Error(saved.error);
        } catch (e) {
          await updateDraftImage(image.id, { ironed_status: "failed" });
          throw e;
        }
      }),
    [draftId, guard, presign, withWorker],
  );

  const recut = useCallback(
    (image: DraftImageRow) =>
      guard(async () => {
        setBusy({ imageId: image.id, kind: "recut", stage: "processing" });
        const signed = await fetch(`/api/admin/r2/original?imageId=${image.id}`);
        if (!signed.ok) throw new Error("No se pudo leer el original");
        const original = await (await fetch(((await signed.json()) as { url: string }).url)).blob();

        const uploads = await presign(image, ["cutout", "web"]);
        // The point of this action is a second opinion: the server model only.
        const done = await withWorker((worker) =>
          runWorkerJob(worker, { jobId: crypto.randomUUID(), mode: "recut", file: original, uploads, providers: ["replicate"] }, () => undefined),
        );
        if (done.mode !== "recut") throw new Error("Unexpected worker result");

        setBusy({ imageId: image.id, kind: "recut", stage: "saving" });
        const { ms, ...fields } = done.result;
        void ms;
        const saved = await updateDraftImage(image.id, fields);
        if (!saved.success) throw new Error(saved.error);
      }),
    [guard, presign, withWorker],
  );

  return { busy, error, iron, recut };
}

export type PhotoRetouch = ReturnType<typeof usePhotoRetouch>;
