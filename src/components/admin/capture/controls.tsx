"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { DEFECT_SEVERITIES, DEFECT_TYPES, type Defect } from "@/lib/catalog/schema";
import { Field, inputClass, type FieldTone } from "@/components/admin/staging/fields";

export const DEFECT_LABEL: Record<Defect["type"], string> = {
  hole: "Agujero",
  stain: "Mancha",
  pilling: "Motas",
  fading: "Decoloración",
  wear: "Desgaste",
  pull: "Jalón",
  other: "Otro",
};
const SEVERITY_LABEL: Record<Defect["severity"], string> = { minimal: "Mínimo", mild: "Leve", noticeable: "Visible" };

/** Text input / textarea that commits on blur. Optional `list` links a <datalist> of suggestions. */
export function TextField({
  label,
  value,
  onSave,
  tone,
  hint,
  multiline,
  disabled,
  list,
  placeholder,
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
  tone?: FieldTone;
  hint?: string;
  multiline?: boolean;
  disabled?: boolean;
  list?: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value ?? "");
  }
  const commit = () => {
    const next = local.trim() || null;
    if (next !== (value ?? null)) onSave(next);
  };
  return (
    <Field label={label} tone={tone} hint={hint}>
      {multiline ? (
        <textarea
          className={`${inputClass(tone)} min-h-28 resize-y`}
          value={local}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          className={inputClass(tone)}
          value={local}
          list={list}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
      )}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onSave,
  tone,
  step = 0.5,
  disabled,
  prefix,
}: {
  label: string;
  value: number | null;
  onSave: (value: number | null) => void;
  tone?: FieldTone;
  step?: number;
  disabled?: boolean;
  prefix?: string;
}) {
  const [local, setLocal] = useState(value === null ? "" : String(Number(value)));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value === null ? "" : String(Number(value)));
  }
  return (
    <Field label={label} tone={tone}>
      <div className="relative">
        {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base md:text-sm">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={0}
          className={`${inputClass(tone)} ${prefix ? "pl-10" : ""}`}
          value={local}
          disabled={disabled}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const next = local === "" ? null : Number(local);
            if (next !== (value === null ? null : Number(value))) onSave(next);
          }}
        />
      </div>
    </Field>
  );
}

/** Tappable options instead of a <select>: one tap, no native picker. Tapping the active chip clears it. */
export function ChipSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  tone,
  disabled,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T | null) => void;
  tone?: FieldTone;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-800 flex items-center gap-2 mb-2">
        {label}
        {tone === "missing" && <span className="text-[11px] font-medium text-rose-600">Falta</span>}
        {tone === "uncertain" && <span className="text-[11px] font-medium text-amber-700">Revisar</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : o.value)}
              className={`min-w-11 h-11 px-3.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Native <details> with a quiet header: keeps secondary fields one tap away, not in your face. */
export function Disclosure({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-gray-200 bg-white" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-medium text-gray-900">{title}</span>
          {hint && <span className="block text-xs text-gray-500">{hint}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-gray-100 px-4 py-5">{children}</div>
    </details>
  );
}

export function DefectsEditor({
  defects,
  onChange,
  disabled,
}: {
  defects: Defect[];
  onChange: (d: Defect[]) => void;
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<Defect>) =>
    onChange(defects.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">Defectos</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...defects, { type: "other", zone: "", severity: "mild", note: null }])}
          className="flex items-center gap-1.5 text-sm px-3 h-9 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {defects.length === 0 && <p className="text-sm text-gray-500">Sin defectos registrados.</p>}
      {defects.map((d, i) => (
        <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
          <select
            className={inputClass()}
            aria-label="Tipo de defecto"
            value={d.type}
            disabled={disabled}
            onChange={(e) => update(i, { type: e.target.value as Defect["type"] })}
          >
            {DEFECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DEFECT_LABEL[t]}
              </option>
            ))}
          </select>
          <select
            className={inputClass()}
            aria-label="Severidad"
            value={d.severity}
            disabled={disabled}
            onChange={(e) => update(i, { severity: e.target.value as Defect["severity"] })}
          >
            {DEFECT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass(d.zone ? "ok" : "missing")} col-span-1`}
            aria-label="Zona del defecto"
            placeholder="Zona (manga, pecho…)"
            defaultValue={d.zone}
            disabled={disabled}
            onBlur={(e) => e.target.value !== d.zone && update(i, { zone: e.target.value })}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(defects.filter((_, j) => j !== i))}
            className="justify-self-end p-2.5 text-rose-600"
            aria-label="Quitar defecto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {d.note && <p className="col-span-full text-xs text-gray-500 -mt-1">{d.note}</p>}
        </div>
      ))}
    </div>
  );
}
