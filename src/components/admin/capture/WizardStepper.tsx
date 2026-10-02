"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { WIZARD_STEPS, type StepKey, type StepStatus } from "@/lib/capture/wizardSteps";
import { BottomSheet } from "./BottomSheet";

function Bullet({ n, active, status }: { n: number; active: boolean; status: StepStatus }) {
  const tone = active
    ? "bg-gray-900 text-white ring-4 ring-gray-900/10"
    : status === "ok"
      ? "bg-emerald-600 text-white"
      : "bg-white text-gray-600 border border-gray-300 group-hover:border-gray-500";
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${tone}`}>
      {status === "ok" && !active ? <Check className="h-4 w-4" /> : n}
    </span>
  );
}

/**
 * Numbered steps you can tap to jump to. Each shows its title and, from `sm` up,
 * what it contains; on phones "Ver pasos" opens the same list with descriptions.
 */
export function WizardStepper({
  current,
  statuses,
  onSelect,
}: {
  current: StepKey;
  statuses: Record<StepKey, StepStatus>;
  onSelect: (step: StepKey) => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  const index = WIZARD_STEPS.findIndex((s) => s.key === current);
  const step = WIZARD_STEPS[index];

  return (
    <nav aria-label="Pasos" className="mx-auto w-full max-w-xl px-3 pb-2 pt-3">
      <ol className="grid grid-cols-5 gap-1">
        {WIZARD_STEPS.map((s, i) => {
          const active = s.key === current;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onSelect(s.key)}
                title={s.description}
                aria-current={active ? "step" : undefined}
                aria-label={`Paso ${i + 1}: ${s.label}. ${s.description}${statuses[s.key] === "ok" ? ". Completo" : ""}`}
                className="group flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 hover:bg-gray-100"
              >
                <Bullet n={i + 1} active={active} status={statuses[s.key]} />
                <span className={`text-xs font-medium ${active ? "text-gray-900" : "text-gray-600"}`}>{s.label}</span>
                <span className="hidden text-center text-[11px] leading-tight text-gray-500 sm:block">{s.description}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-1 flex items-center justify-between gap-3 px-2">
        <p className="min-w-0 truncate text-xs text-gray-500">
          Paso {index + 1} de {WIZARD_STEPS.length} · <span className="font-medium text-gray-800">{step.label}</span>
          <span className="sm:hidden"> — {step.description}</span>
        </p>
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-700 sm:hidden"
        >
          Ver pasos <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <BottomSheet open={listOpen} title="Ir a un paso" onClose={() => setListOpen(false)}>
        <ul className="space-y-1">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => {
                  setListOpen(false);
                  onSelect(s.key);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-gray-50"
              >
                <Bullet n={i + 1} active={s.key === current} status={statuses[s.key]} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">{s.label}</span>
                  <span className="block text-xs text-gray-500">{s.description}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-500">{statuses[s.key] === "ok" ? "Completo" : "Pendiente"}</span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </nav>
  );
}
