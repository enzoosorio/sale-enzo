"use client";

import { useState } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { useTitleVerification } from "@/hooks/useTitleVerification";
import type { DraftFields } from "@/lib/catalog/schema";
import { BottomSheet } from "./BottomSheet";
import type { StepProps } from "./types";

const SPEC_LABEL = { technology: "Tecnología", material: "Material" } as const;

/**
 * "Verificar en la web" next to the product name. Searches the web for the
 * title and offers what it found; nothing is written until the owner taps
 * "Aplicar" on a specific value.
 */
export function TitleVerifier({ draft, locked, set }: Pick<StepProps, "draft" | "locked" | "set">) {
  const [open, setOpen] = useState(false);
  const { state, result, error, verify } = useTitleVerification();
  const name = draft.name?.trim() ?? "";
  const metadata = draft.metadata as Record<string, string>;

  const run = () => {
    setOpen(true);
    void verify(name, draft.brand);
  };

  const apply = (key: keyof typeof SPEC_LABEL, value: string) =>
    set("metadata", { ...metadata, [key]: value } as DraftFields["metadata"]);

  const specs = result
    ? (Object.keys(SPEC_LABEL) as (keyof typeof SPEC_LABEL)[])
        .map((key) => ({ key, value: result.specs[key] }))
        .filter((s): s is { key: keyof typeof SPEC_LABEL; value: string } => !!s.value)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={locked || name.length < 2 || state === "checking"}
        className="-mt-2 flex items-center gap-2 text-sm font-medium text-gray-700 underline-offset-4 hover:underline disabled:opacity-40"
      >
        <Globe className="h-4 w-4" /> Verificar en la web
      </button>

      <BottomSheet open={open} title="Verificar en la web" onClose={() => setOpen(false)}>
        <div className="space-y-4 text-sm">
          <p className="text-gray-500">
            “{name}”{draft.brand ? ` · ${draft.brand}` : ""}
          </p>

          {state === "checking" && (
            <p className="flex items-center gap-2 text-gray-700" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando en la web…
            </p>
          )}

          {state === "error" && (
            <p className="text-rose-600" role="alert">
              {error}
            </p>
          )}

          {state === "done" && result && (
            <>
              <p className={`rounded-xl p-3 ${result.matched ? "bg-emerald-50 text-emerald-900" : "bg-gray-50 text-gray-700"}`}>
                {result.matched ? "Encontré un producto que coincide." : "Sin coincidencia clara."} {result.summary}
              </p>

              {result.matched && result.canonical_name && (
                <Row label="Nombre oficial" value={result.canonical_name} disabled={locked || result.canonical_name === draft.name} onApply={() => set("name", result.canonical_name)} />
              )}
              {result.matched &&
                specs.map((s) => (
                  <Row key={s.key} label={SPEC_LABEL[s.key]} value={s.value} disabled={locked || metadata[s.key] === s.value} onApply={() => apply(s.key, s.value)} />
                ))}

              {result.sources.length > 0 && (
                <ul className="space-y-1.5">
                  {result.sources.map((src) => (
                    <li key={src.url}>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <button type="button" onClick={() => setOpen(false)} className="h-11 w-full rounded-xl border border-gray-200 text-sm font-medium">
            Cerrar
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function Row({ label, value, disabled, onApply }: { label: string; value: string; disabled: boolean; onApply: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate font-medium text-gray-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className="h-9 shrink-0 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white disabled:opacity-40"
      >
        {disabled ? "Aplicado" : "Aplicar"}
      </button>
    </div>
  );
}
