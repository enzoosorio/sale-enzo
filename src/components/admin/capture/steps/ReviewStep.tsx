"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Circle, ExternalLink } from "lucide-react";
import { DraftPreview } from "@/components/admin/staging/DraftPreview";
import { Section } from "@/components/admin/staging/fields";
import { stepMissing, WIZARD_STEPS, type StepKey } from "@/lib/capture/wizardSteps";
import { orderedDoneImages } from "@/lib/staging/draftToPreview";
import type { DraftWithImages } from "@/types/staging";

const CHECKLIST = WIZARD_STEPS.filter((s) => s.key !== "review");

export function ReviewStep({
  draft,
  warnings,
  goTo,
}: {
  draft: DraftWithImages;
  warnings: string[];
  goTo: (step: StepKey) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const done = orderedDoneImages(draft.images).length;
  const published = draft.status === "published";
  const discarded = draft.status === "discarded";

  const rows = CHECKLIST.map((s) => ({ ...s, missing: stepMissing(s.key, draft.missing_fields, done) }));
  const pendingCount = rows.filter((r) => r.missing.length).length;

  return (
    <div className="space-y-8">
      {published && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <span>Este producto ya está publicado.</span>
          <a
            href={`/products/${draft.published_product_id}?variant=${draft.published_variant_id}`}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 font-medium underline"
          >
            Ver en la tienda <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
      {discarded && <div className="rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700">Este borrador está descartado.</div>}

      <Section
        title={pendingCount === 0 ? "Todo listo" : "Antes de publicar"}
        subtitle={
          pendingCount === 0
            ? "Revisa la vista previa y publica."
            : `${pendingCount} ${pendingCount === 1 ? "paso necesita" : "pasos necesitan"} algo.`
        }
      >
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {rows.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => goTo(r.key)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
              >
                {r.missing.length === 0 ? (
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">{r.label}</span>
                  {r.missing.length > 0 && <span className="block text-sm text-gray-500">Falta: {r.missing.join(", ")}</span>}
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {warnings.length > 0 && (
        <ul className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}

      <details
        className="group rounded-2xl border border-gray-200 bg-white"
        onToggle={(e) => setShowPreview((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
          Vista previa en la tienda
          <span className="text-xs font-normal text-gray-500 group-open:hidden">Ver</span>
        </summary>
        <div className="border-t border-gray-100 p-4">{showPreview && <DraftPreview draft={draft} />}</div>
      </details>
    </div>
  );
}
