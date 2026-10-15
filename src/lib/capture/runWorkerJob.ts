import type { WorkerJob, WorkerMessage, WorkerStage } from "@/workers/image.worker";

export type WorkerDone = Extract<WorkerMessage, { type: "done" }>;

/** The worker died, hung or couldn't be reached: the caller must discard it and start a fresh one. */
export class WorkerCrash extends Error {}

/** Longest silence tolerated from the worker (model download + inference give no progress while thinking). */
const DEFAULT_WATCHDOG_MS = 150_000;

/**
 * Sends one job to the image worker and resolves with its `done` message.
 * Unlike a bare message listener this also settles when the worker throws,
 * fails to deserialize, or goes quiet for too long, so the queue can never
 * wait forever on a crashed worker (iOS kills them on memory pressure).
 */
export function runWorkerJob(
  worker: Worker,
  job: WorkerJob,
  onProgress: (stage: WorkerStage, fraction?: number) => void,
  watchdogMs = DEFAULT_WATCHDOG_MS,
): Promise<WorkerDone> {
  return new Promise<WorkerDone>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => fail(new WorkerCrash(`El procesamiento no responde (${Math.round(watchdogMs / 1000)} s sin avances)`)),
        watchdogMs,
      );
    };

    function onMessage(e: MessageEvent<WorkerMessage>) {
      if (e.data.jobId !== job.jobId) return;
      arm();
      if (e.data.type === "progress") return onProgress(e.data.stage, e.data.fraction);
      cleanup();
      if (e.data.type === "done") resolve(e.data);
      else reject(new Error(e.data.error));
    }
    function onError(e: ErrorEvent) {
      fail(new WorkerCrash(e.message || "El worker de imágenes falló"));
    }
    function onMessageError() {
      fail(new WorkerCrash("El worker de imágenes devolvió datos ilegibles"));
    }

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
    arm();
    worker.postMessage(job);
  });
}
