"use client";

import { useCallback, useRef, useState } from "react";
import type { DraftWithImages } from "@/types/staging";

type VoiceState = "idle" | "recording" | "transcribing" | "extracting" | "error";

/** iOS Safari records audio/mp4; Chrome/Firefox prefer webm. */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Hold-to-talk capture: record → /api/admin/transcribe → /api/admin/extract.
 * Returns the merged draft; dictating again applies corrections on top.
 */
export function useVoiceCapture(draftId: string, onDraft: (draft: DraftWithImages, warnings: string[]) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const process = useCallback(
    async (audio: Blob) => {
      try {
        setState("transcribing");
        const ext = audio.type.includes("mp4") ? "m4a" : "webm";
        const form = new FormData();
        form.append("audio", new File([audio], `dictado.${ext}`, { type: audio.type }));
        const stt = await fetch("/api/admin/transcribe", { method: "POST", body: form });
        const sttBody = await stt.json();
        if (!stt.ok) throw new Error(sttBody.error ?? "No se pudo transcribir");
        setTranscript(sttBody.text);

        setState("extracting");
        const res = await fetch("/api/admin/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draftId, transcript: sttBody.text }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "No se pudo interpretar el dictado");
        onDraft(body.draft, body.warnings ?? []);
        setState("idle");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    },
    [draftId, onDraft],
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/mp4" });
        if (audio.size > 0) void process(audio);
        else setState("idle");
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Micrófono no disponible");
      setState("error");
    }
  }, [process]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
  }, []);

  /** Typed fallback (desktop or noisy places): skips STT. */
  const submitText = useCallback(
    async (text: string) => {
      setTranscript(text);
      setError(null);
      setState("extracting");
      const res = await fetch("/api/admin/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId, transcript: text }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "No se pudo interpretar el texto");
        setState("error");
        return;
      }
      onDraft(body.draft, body.warnings ?? []);
      setState("idle");
    },
    [draftId, onDraft],
  );

  return { state, transcript, error, start, stop, submitText };
}
