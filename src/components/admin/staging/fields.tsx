"use client";

import type { ReactNode, SyntheticEvent } from "react";
import { CONFIDENCE } from "@/lib/catalog/confidence";

export type FieldTone = "missing" | "uncertain" | "ok";

const TONE_CLASS: Record<FieldTone, string> = {
  missing: "border-rose-300 bg-rose-50/50",
  uncertain: "border-amber-300 bg-amber-50/50",
  ok: "border-gray-200 bg-white",
};

export const inputClass = (tone: FieldTone = "ok") =>
  `w-full rounded-xl border px-3.5 py-3 text-base md:text-sm outline-none transition-shadow focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-60 ${TONE_CLASS[tone]}`;

/** Props every AI-aware field takes: where the value came from and how sure the model was. */
export interface AiFieldProps {
  source?: "user" | "ai";
  confidence?: number;
  /** Accepts an AI suggestion as-is (marks it owner-confirmed). */
  onConfirm?: () => void;
}

/**
 * Provenance badge for AI-filled fields: amber "Sugerido · 62%" when the model
 * was unsure (tap to confirm), a quiet "IA" when it was confident enough to autofill.
 *
 * Not a <button>: it lives inside the field's <label>, and a labelable child
 * would steal the label's association from the input.
 */
export function SourceBadge({ source, confidence, onConfirm }: AiFieldProps) {
  if (source !== "ai") return null;
  if (confidence !== undefined && confidence < CONFIDENCE.autofill) {
    const text = `Sugerido · ${Math.round(confidence * 100)}%`;
    if (!onConfirm) return <span className="text-[11px] font-medium text-amber-700">{text}</span>;
    const confirm = (e: SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onConfirm();
    };
    return (
      <span
        role="button"
        tabIndex={0}
        title="Confirmar este valor"
        className="cursor-pointer rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-200"
        onClick={confirm}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && confirm(e)}
      >
        {text} ✓
      </span>
    );
  }
  return <span className="text-[11px] font-medium text-gray-400">IA</span>;
}

export function Field({
  label,
  tone = "ok",
  hint,
  source,
  confidence,
  onConfirm,
  children,
}: AiFieldProps & {
  label: string;
  tone?: FieldTone;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 min-w-0">
      <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
        {label}
        {tone === "missing" && <span className="text-[11px] font-medium text-rose-600">Falta</span>}
        {tone === "uncertain" && <span className="text-[11px] font-medium text-amber-700">Revisar</span>}
        <SourceBadge source={source} confidence={confidence} onConfirm={onConfirm} />
      </span>
      {children}
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  tone,
  placeholder = "—",
  source,
  confidence,
  onConfirm,
}: AiFieldProps & {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T | null) => void;
  tone?: FieldTone;
  placeholder?: string;
}) {
  return (
    <Field label={label} tone={tone} source={source} confidence={confidence} onConfirm={onConfirm}>
      <select
        className={inputClass(tone)}
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Titled group of fields. No card chrome: spacing does the grouping. */
export function Section({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      {title && (
        <header className="space-y-1">
          <h2 className="font-prata text-xl text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
