"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VerifyTitleResult } from "@/lib/catalog/verifyTitle";

export type TitleVerificationState = "idle" | "checking" | "done" | "error";

/**
 * Manual "does this product exist?" check: POST /api/admin/verify-title.
 * The result is only ever shown; the caller decides what to apply. A new call
 * cancels the previous one.
 */
export function useTitleVerification() {
  const [state, setState] = useState<TitleVerificationState>("idle");
  const [result, setResult] = useState<VerifyTitleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const verify = useCallback(async (name: string, brand: string | null) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setResult(null);
    setState("checking");
    try {
      const res = await fetch("/api/admin/verify-title", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, brand }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? "No se pudo verificar");
      setResult((body as { result: VerifyTitleResult }).result);
      setState("done");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, verify, reset };
}
