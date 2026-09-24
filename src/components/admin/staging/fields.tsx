"use client";

import type { ReactNode } from "react";

export type FieldTone = "missing" | "uncertain" | "ok";

const TONE_CLASS: Record<FieldTone, string> = {
  missing: "border-red-400 bg-red-50/60",
  uncertain: "border-amber-400 bg-amber-50/60",
  ok: "border-gray-300 bg-white",
};

export const inputClass = (tone: FieldTone = "ok") =>
  `w-full rounded-lg border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-gray-900/20 ${TONE_CLASS[tone]}`;

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
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {label}
        {tone === "missing" && <span className="text-[11px] font-semibold text-red-600">Falta</span>}
        {tone === "uncertain" && <span className="text-[11px] font-semibold text-amber-700">Revisar</span>}
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

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <header>
        <h2 className="font-prata text-lg text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
