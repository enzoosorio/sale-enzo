"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftWithImages } from "@/types/staging";

export type PhotoAnalysisState = "idle" | "analyzing" | "error";

export interface PhotoAnalysisMeta {
  warnings: string[];
  autofilled: number;
  suggested: number;
}

/**
 * One-shot photo analysis: POST /api/admin/analyze-photos and hand the merged
 * draft to the caller. A new call cancels the previous one; analysis never
 * blocks the UI (the caller shows its own non-blocking indicator).
 */
export function usePhotoAnalysis(
  draftId: string,
  onDraft: (draft: DraftWithImages, meta: PhotoAnalysisMeta) => void,
  /** Resolves the draft id when it doesn't exist yet. Photos normally require a draft, so this is a fallback. */
  ensureDraft?: () => Promise<string>,
) {
  const [state, setState] = useState<PhotoAnalysisState>("idle");
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const analyze = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setState("analyzing");
    try {
      const id = draftId || (await ensureDraft?.()) || "";
      const res = await fetch("/api/admin/analyze-photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: id }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? "No se pudieron analizar las fotos");
      onDraft(body.draft, {
        warnings: body.warnings ?? [],
        autofilled: body.autofilled?.length ?? 0,
        suggested: body.suggested?.length ?? 0,
      });
      setState("idle");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }, [draftId, ensureDraft, onDraft]);

  return { state, error, analyze };
}

export type PhotoAnalysis = ReturnType<typeof usePhotoAnalysis>;
