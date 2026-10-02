"use client";

import { useState } from "react";
import { Keyboard, Loader2, Mic, Send, Square, X } from "lucide-react";
import { inputClass } from "@/components/admin/staging/fields";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import type { DraftWithImages } from "@/types/staging";

const STATE_LABEL = {
  idle: "Dicta o escribe el producto",
  recording: "Grabando… toca el micrófono para terminar",
  transcribing: "Transcribiendo…",
  extracting: "Interpretando y clasificando…",
  error: "Algo falló",
} as const;

/**
 * Floating dictation button, always within thumb reach. Dictating again applies
 * corrections ("cambia la talla a L"). The keyboard button opens a typed fallback.
 */
export function VoiceFab({
  draftId,
  disabled,
  onDraft,
  ensureDraft,
}: {
  /** "" while the draft hasn't been created yet */
  draftId: string;
  disabled?: boolean;
  onDraft: (draft: DraftWithImages, warnings: string[]) => void;
  ensureDraft: () => Promise<string>;
}) {
  const { state, transcript, error, start, stop, submitText } = useVoiceCapture(draftId, onDraft, ensureDraft);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const busy = state === "transcribing" || state === "extracting";
  const showPanel = typing || state !== "idle";

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 flex flex-col items-end gap-3">
      {showPanel && (
        <div className="pointer-events-auto w-[min(21rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-gray-900" aria-live="polite">
              {STATE_LABEL[state]}
            </p>
            {typing && state === "idle" && (
              <button type="button" onClick={() => setTyping(false)} aria-label="Cerrar" className="-m-1 p-1 text-gray-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : transcript ? (
            <p className="line-clamp-3 text-sm text-gray-600">“{transcript}”</p>
          ) : (
            <p className="text-sm text-gray-500">Ej: “Polo Nike Dri-FIT de los Bulls, talla M, le queda S, 9 de 10, un huequito en la manga, 59 soles”.</p>
          )}
          {typing && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim().length > 1) {
                  void submitText(text.trim());
                  setText("");
                }
              }}
            >
              <input
                className={inputClass()}
                placeholder="Escríbelo aquí"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled || busy}
                autoFocus
              />
              <button
                type="submit"
                disabled={disabled || busy || text.trim().length < 2}
                className="grid w-12 shrink-0 place-items-center rounded-xl bg-gray-900 text-white disabled:opacity-40"
                aria-label="Enviar texto"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTyping((t) => !t)}
          aria-label="Escribir en vez de dictar"
          aria-pressed={typing}
          className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md"
        >
          <Keyboard className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={state === "recording" ? stop : start}
          aria-label={state === "recording" ? "Detener grabación" : "Empezar a dictar"}
          className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-colors disabled:opacity-50 ${
            state === "recording" ? "animate-pulse bg-rose-600" : "bg-gray-900"
          }`}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : state === "recording" ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
