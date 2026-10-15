"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { Section } from "@/components/admin/staging/fields";
import { aiFieldProps } from "@/lib/capture/aiField";
import { ChipSelect, DefectsEditor, Disclosure, NumberField, TextField } from "../controls";
import type { StepProps } from "../types";

const COMMON_SCORES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5];

export function PriceStep({ draft, locked, tone, set, save, ensureDraft }: StepProps) {
  const [generating, setGenerating] = useState(false);

  // keep an uncommon saved value (e.g. 6.5) selectable
  const current = draft.condition_score !== null ? Number(draft.condition_score) : null;
  const scores =
    current !== null && !COMMON_SCORES.includes(current) ? [...COMMON_SCORES, current].sort((a, b) => b - a) : COMMON_SCORES;

  const generateCopy = async () => {
    setGenerating(true);
    try {
      const draftId = await ensureDraft();
      const res = await fetch("/api/admin/copy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const body = await res.json();
      if (!res.ok) return toast.error(body.error ?? "No se pudo generar");
      save({ description: body.description, condition_note: body.condition_note });
      if (body.issues?.length) toast(`Revisa el texto: ${body.issues.join(", ")}`, { icon: "⚠️" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-10">
      <Section title="Estado y precio">
        <div className="space-y-6">
          <ChipSelect
            label="Estado (de 10)"
            value={current}
            tone={tone("condition_score")}
            {...aiFieldProps(draft, "condition_score", set)}
            disabled={locked}
            options={scores.map((n) => ({ value: n, label: String(n) }))}
            onChange={(v) => set("condition_score", v)}
          />
          <NumberField label="Precio" prefix="S/" value={draft.price} tone={tone("price")} {...aiFieldProps(draft, "price", set)} onSave={(v) => set("price", v)} disabled={locked} />
          <DefectsEditor defects={draft.defects} disabled={locked} onChange={(d) => set("defects", d)} />
        </div>
      </Section>

      <Section title="Textos para la tienda" subtitle="Mejor generarlos al final, con todo lo anterior ya lleno.">
        <button
          type="button"
          onClick={generateCopy}
          disabled={locked || generating}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:border-gray-400 disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> {generating ? "Generando…" : "Generar con IA"}
        </button>
        <TextField label="Descripción" multiline value={draft.description} onSave={(v) => set("description", v)} disabled={locked} />
        <TextField
          label="Nota de estado"
          hint="Menciona los defectos con tacto. Nunca los omitas."
          multiline
          value={draft.condition_note}
          tone={draft.defects.length > 0 && !draft.condition_note ? "missing" : "ok"}
          onSave={(v) => set("condition_note", v)}
          disabled={locked}
        />
      </Section>

      <Disclosure title="Más opciones" hint="Precio antes, stock y notas privadas (no llegan a la tienda)">
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Precio antes" prefix="S/" value={draft.compare_at_price} onSave={(v) => set("compare_at_price", v)} disabled={locked} />
          <NumberField label="Stock" value={draft.stock} step={1} onSave={(v) => set("stock", v ?? 1)} disabled={locked} />
        </div>
        <TextField label="Especificaciones (crudo)" multiline value={draft.specs_raw} onSave={(v) => set("specs_raw", v)} disabled={locked} />
        <TextField label="Notas de precio" value={draft.price_notes} onSave={(v) => set("price_notes", v)} disabled={locked} />
        <TextField label="Notas internas" value={draft.internal_notes} onSave={(v) => set("internal_notes", v)} disabled={locked} />
      </Disclosure>
    </div>
  );
}
