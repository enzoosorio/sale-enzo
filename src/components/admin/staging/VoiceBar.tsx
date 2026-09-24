"use client";

import { useState } from "react";
import { Loader2, Mic, Send, Square } from "lucide-react";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import type { DraftWithImages } from "@/types/staging";
import { inputClass } from "./fields";

const STATE_LABEL = {
  idle: "Toca y dicta el producto",
  recording: "Grabando… toca para terminar",
  transcribing: "Transcribiendo…",
  extracting: "Interpretando y clasificando…",
  error: "Algo falló",
} as const;

/** Dictation (and typed fallback). Dictating again applies corrections: "cambia la talla a L". */
export function VoiceBar({
  draftId,
  onDraft,
  disabled,
}: {
  draftId: string;
  onDraft: (draft: DraftWithImages, warnings: string[]) => void;
  disabled?: boolean;
}) {
  const { state, transcript, error, start, stop, submitText } = useVoiceCapture(draftId, onDraft);
  const [text, setText] = useState("");
  const busy = state === "transcribing" || state === "extracting";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={state === "recording" ? stop : start}
          aria-label={state === "recording" ? "Detener grabación" : "Empezar a dictar"}
          className={`shrink-0 grid place-items-center w-16 h-16 rounded-full text-white transition-colors disabled:opacity-40 ${
            state === "recording" ? "bg-red-600 animate-pulse" : "bg-gray-900"
          }`}
        >
          {busy ? <Loader2 className="w-7 h-7 animate-spin" /> : state === "recording" ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
        </button>
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{STATE_LABEL[state]}</p>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : transcript ? (
            <p className="text-sm text-gray-600 line-clamp-3">“{transcript}”</p>
          ) : (
            <p className="text-sm text-gray-500">Ej: “Polo Nike Dri-FIT de los Bulls, talla M, le queda S, 9 de 10, un huequito en la manga, 59 soles”.</p>
          )}
        </div>
      </div>
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
          placeholder="…o escríbelo aquí"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || busy}
        />
        <button type="submit" disabled={disabled || busy || text.trim().length < 2} className="px-3 rounded-lg bg-gray-900 text-white disabled:opacity-40" aria-label="Enviar texto">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
