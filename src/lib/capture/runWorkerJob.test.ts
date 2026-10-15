import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWorkerJob, WorkerCrash } from "./runWorkerJob";
import type { WorkerJob, WorkerMessage } from "@/workers/image.worker";

/** Just enough of a Worker: an event target that records what it was sent. */
class FakeWorker extends EventTarget {
  sent: unknown[] = [];
  postMessage(message: unknown) {
    this.sent.push(message);
  }
  emit(data: WorkerMessage) {
    this.dispatchEvent(Object.assign(new Event("message"), { data }));
  }
}

const job: WorkerJob = { jobId: "j1", mode: "photo", file: new Blob(["x"]), uploads: [], providers: ["imgly"] };
const run = (worker: FakeWorker, ms?: number, onProgress = vi.fn()) => runWorkerJob(worker as unknown as Worker, job, onProgress, ms);

const done = (jobId = "j1"): WorkerMessage => ({
  type: "done",
  jobId,
  mode: "recut",
  result: {
    cutout_key: "k",
    cutout_web_key: "w",
    bytes_cutout: 1,
    bytes_web: 1,
    width: 1,
    height: 1,
    dominant_colors: [],
    bg_provider: "imgly",
    cutout_quality: { verdict: "ok", reasons: [], coverage: 0.3, bboxRatio: 0.5, edgeTouch: 0, softAlphaRatio: 0, components: 1, strayShare: 0 },
    needs_review: false,
    ms: 1,
  },
});

describe("runWorkerJob", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("posts the job, relays progress and resolves with the done message", async () => {
    const worker = new FakeWorker();
    const onProgress = vi.fn();
    const pending = run(worker, undefined, onProgress);

    expect(worker.sent).toEqual([job]);
    worker.emit({ type: "progress", jobId: "j1", stage: "remove-bg" });
    worker.emit({ type: "progress", jobId: "other", stage: "encode" }); // someone else's job: ignored
    worker.emit(done());

    await expect(pending).resolves.toMatchObject({ type: "done", mode: "recut" });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith("remove-bg", undefined);
  });

  it("rejects with the worker's own error", async () => {
    const worker = new FakeWorker();
    const pending = run(worker);
    worker.emit({ type: "error", jobId: "j1", error: "R2 upload cutout failed: 403" });
    await expect(pending).rejects.toThrow("R2 upload cutout failed: 403");
    await expect(pending).rejects.not.toBeInstanceOf(WorkerCrash);
  });

  it("treats a crashed worker as fatal instead of waiting forever", async () => {
    const worker = new FakeWorker();
    const pending = run(worker);
    worker.dispatchEvent(Object.assign(new Event("error"), { message: "out of memory" }));
    await expect(pending).rejects.toBeInstanceOf(WorkerCrash);

    const w2 = new FakeWorker();
    const p2 = run(w2);
    w2.dispatchEvent(new Event("messageerror"));
    await expect(p2).rejects.toBeInstanceOf(WorkerCrash);
  });

  it("gives up after the watchdog silence, but any message keeps it alive", async () => {
    const worker = new FakeWorker();
    const pending = run(worker, 1000);
    pending.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(800);
    worker.emit({ type: "progress", jobId: "j1", stage: "model", fraction: 0.5 }); // resets the clock
    await vi.advanceTimersByTimeAsync(800);
    worker.emit({ type: "progress", jobId: "j1", stage: "encode" });
    await vi.advanceTimersByTimeAsync(1100);

    await expect(pending).rejects.toBeInstanceOf(WorkerCrash);
  });

  it("stops listening once settled", async () => {
    const worker = new FakeWorker();
    const onProgress = vi.fn();
    const pending = run(worker, undefined, onProgress);
    worker.emit(done());
    await pending;
    worker.emit({ type: "progress", jobId: "j1", stage: "encode" });
    expect(onProgress).not.toHaveBeenCalled();
  });
});
