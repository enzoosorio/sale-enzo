"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reserveDraftImage, updateDraftImage } from "@/actions/admin/staging";
import { bgProviders } from "@/lib/bg/types";
import type { ShotRole } from "@/lib/catalog/schema";
import { enqueue, jobsFor, patchJob, pruneDone, recoverInterrupted, removeJob, type CaptureJob } from "@/lib/capture/queue";
import { runWorkerJob, WorkerCrash } from "@/lib/capture/runWorkerJob";
import type { PresignedUpload, WorkerStage } from "@/workers/image.worker";
import { createImageWorker } from "@/workers/createImageWorker";

/**
 * Drives the capture queue for one draft: persists photos, feeds the image
 * worker one at a time and records results in staging.draft_images.
 * The UI only ever renders thumbnails + statuses; heavy work is off-thread.
 */
export function useCaptureQueue(draftId: string, onImageDone?: () => void) {
  const [jobs, setJobs] = useState<CaptureJob[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const runningRef = useRef(false);
  const onDoneRef = useRef(onImageDone);
  useEffect(() => {
    onDoneRef.current = onImageDone;
  });

  const refresh = useCallback(async () => setJobs(await jobsFor(draftId)), [draftId]);

  const worker = useCallback(() => {
    workerRef.current ??= createImageWorker();
    return workerRef.current;
  }, []);

  /** A crashed or hung worker is useless (and may hold gigabytes): drop it, the next job gets a fresh one. */
  const discardWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const runJob = useCallback(
    async (job: CaptureJob) => {
      let { imageId, position } = job;
      if (!imageId || position === null) {
        const reserved = await reserveDraftImage(draftId, job.role ?? null);
        if (!reserved.success) throw new Error(reserved.error);
        ({ id: imageId, position } = reserved.data);
        await patchJob(job.id, { imageId, position });
      }
      await updateDraftImage(imageId, { status: "processing", error: null });

      const presign = await fetch("/api/admin/r2/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId, position, kinds: ["original", "cutout", "web"] }),
      });
      if (!presign.ok) throw new Error(`presign ${presign.status}`);
      const { uploads } = (await presign.json()) as { uploads: PresignedUpload[] };

      const done = await runWorkerJob(
        worker(),
        { jobId: job.id, mode: "photo", file: job.file, uploads, providers: bgProviders() },
        (stage: WorkerStage, fraction?: number) => {
          const label = stage + (fraction ? ` ${Math.round(fraction * 100)}%` : "");
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, stage: label } : j)));
        },
      ).catch((e: unknown) => {
        if (e instanceof WorkerCrash) discardWorker();
        throw e;
      });
      if (done.mode !== "photo") throw new Error("Unexpected worker result");

      const { ms, ...fields } = done.result;
      const saved = await updateDraftImage(imageId, { ...fields, status: "done", error: null });
      if (!saved.success) throw new Error(saved.error);
      await patchJob(job.id, { status: "done", stage: undefined, ms });
    },
    [draftId, worker, discardWorker],
  );

  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      for (;;) {
        const next = (await jobsFor(draftId)).find((j) => j.status === "queued");
        if (!next) break;
        await patchJob(next.id, { status: "processing" });
        await refresh();
        try {
          await runJob(next);
          onDoneRef.current?.();
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          await patchJob(next.id, { status: "failed", error, stage: undefined });
          if (next.imageId) await updateDraftImage(next.imageId, { status: "failed", error });
        }
        await refresh();
      }
    } finally {
      runningRef.current = false;
    }
  }, [draftId, refresh, runJob]);

  useEffect(() => {
    // Interrupted jobs resume; finished ones from earlier sessions no longer need their photo blob.
    recoverInterrupted(draftId).then(() => pruneDone(draftId)).then(refresh).then(pump);
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [draftId, pump, refresh]);

  const addFiles = useCallback(
    async (files: File[], role: ShotRole | null = null) => {
      if (files.length === 0) return;
      await enqueue(draftId, files, role);
      await refresh();
      void pump();
    },
    [draftId, pump, refresh],
  );

  const retry = useCallback(
    async (jobId: string) => {
      await patchJob(jobId, { status: "queued", error: undefined });
      await refresh();
      void pump();
    },
    [pump, refresh],
  );

  const dismiss = useCallback(
    async (jobId: string) => {
      await removeJob(jobId);
      await refresh();
    },
    [refresh],
  );

  return { jobs, addFiles, retry, dismiss };
}
