"use client";

import { createStore, del, entries, set, update } from "idb-keyval";

/**
 * Persistent photo queue (IndexedDB). A photo is stored the moment it's taken,
 * so if Safari reloads mid-processing nothing is lost; unfinished jobs resume.
 */

export type JobStatus = "queued" | "processing" | "done" | "failed";

export interface CaptureJob {
  id: string;
  draftId: string;
  file: Blob;
  fileName: string;
  createdAt: number;
  status: JobStatus;
  /** staging.draft_images row reserved for this photo */
  imageId: string | null;
  position: number | null;
  stage?: string;
  error?: string;
  ms?: number;
}

const store = typeof indexedDB !== "undefined" ? createStore("sale-enzo-capture", "jobs") : undefined;

export async function enqueue(draftId: string, files: File[]): Promise<CaptureJob[]> {
  const jobs = files.map<CaptureJob>((file, i) => ({
    id: crypto.randomUUID(),
    draftId,
    file,
    fileName: file.name,
    createdAt: Date.now() + i,
    status: "queued",
    imageId: null,
    position: null,
  }));
  await Promise.all(jobs.map((j) => set(j.id, j, store)));
  return jobs;
}

export async function patchJob(id: string, patch: Partial<CaptureJob>): Promise<void> {
  await update<CaptureJob>(id, (job) => (job ? { ...job, ...patch } : (job as unknown as CaptureJob)), store);
}

export async function removeJob(id: string): Promise<void> {
  await del(id, store);
}

export async function jobsFor(draftId: string): Promise<CaptureJob[]> {
  const all = await entries<string, CaptureJob>(store);
  return all
    .map(([, job]) => job)
    .filter((job) => job.draftId === draftId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Jobs interrupted by a reload go back to the queue. */
export async function recoverInterrupted(draftId: string): Promise<void> {
  const jobs = await jobsFor(draftId);
  await Promise.all(
    jobs.filter((j) => j.status === "processing").map((j) => patchJob(j.id, { status: "queued", stage: undefined })),
  );
}

/** Finished jobs keep their blob only until the server confirms; then they're dropped. */
export async function pruneDone(draftId: string): Promise<void> {
  const jobs = await jobsFor(draftId);
  await Promise.all(jobs.filter((j) => j.status === "done").map((j) => removeJob(j.id)));
}
