"use client";

import type { ReactNode } from "react";

export type FieldTone = "missing" | "uncertain" | "ok";

const TONE_CLASS: Record<FieldTone, string> = {
  missing: "border-rose-300 bg-rose-50/50",
  uncertain: "border-amber-300 bg-amber-50/50",
  ok: "border-gray-200 bg-white",
};

export const inputClass = (tone: FieldTone = "ok") =>
  `w-full rounded-xl border px-3.5 py-3 text-base md:text-sm outline-none transition-shadow focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-60 ${TONE_CLASS[tone]}`;

export function Field({
  label,
  tone = "ok",
  hint,
  children,
}: {
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
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T | null) => void;
  tone?: FieldTone;
  placeholder?: string;
}) {
  return (
    <Field label={label} tone={tone}>
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
