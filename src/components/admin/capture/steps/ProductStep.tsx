"use client";

import { use, useMemo } from "react";
import { Section, SelectField } from "@/components/admin/staging/fields";
import type { MatchKind } from "@/lib/catalog/schema";
import { Disclosure, TextField } from "../controls";
import type { CaptureContext, StepProps } from "../types";

const MATCH_LABEL: Record<MatchKind, string> = {
  new_product: "Producto nuevo",
  new_variant: "Nueva variante de un producto",
  new_item: "Otra unidad de una variante",
};

export function ProductStep({ draft, locked, tone, save, set, context }: StepProps & { context: Promise<CaptureContext> }) {
  const { taxonomy, brands, catalog } = use(context);

  const subcategories = useMemo(
    () => taxonomy.flatMap((c) => c.children.map((s) => ({ ...s, parentId: c.id, parentName: c.name }))),
    [taxonomy],
  );

  const productOptions = catalog.map((p) => ({
    value: p.ref,
    label: `${p.name}${p.ref.startsWith("dp:") ? " (borrador)" : ""}`,
  }));
  const variantOptions = catalog.flatMap((p) =>
    p.variants.map((v) => ({
      value: v.ref,
      label: `${p.name} · ${v.size ?? "?"} · ${v.gender ?? "?"}${v.ref.startsWith("dv:") ? " (borrador)" : ""}`,
    })),
  );
  const currentProductRef =
    draft.target_draft_id && draft.match_kind === "new_variant"
      ? `dp:${draft.target_draft_id}`
      : draft.target_product_id
        ? `p:${draft.target_product_id}`
        : null;
  const currentVariantRef =
    draft.target_draft_id && draft.match_kind === "new_item"
      ? `dv:${draft.target_draft_id}`
      : draft.target_variant_id
        ? `v:${draft.target_variant_id}`
        : null;

  const setTargetRef = (ref: string | null) => {
    const [kind, id] = ref?.split(":") ?? [];
    save({
      target_product_id: kind === "p" ? id : null,
      target_variant_id: kind === "v" ? id : null,
      target_draft_id: kind === "dp" || kind === "dv" ? id : null,
    });
  };

  const matchTone = tone("match_kind") === "ok" ? tone("match") : tone("match_kind");
  const needsAttention = draft.match_kind !== "new_product" || matchTone !== "ok";

  return (
    <div className="space-y-8">
      <Section title="¿Qué prenda es?" subtitle="Lo básico. Puedes dictarlo con el micrófono.">
        <div className="space-y-5">
          <TextField
            label="Nombre"
            placeholder="Polo Nike Dri-FIT Chicago Bulls"
            value={draft.name}
            tone={tone("name")}
            onSave={(v) => set("name", v)}
            disabled={locked}
          />
          <TextField label="Marca" list="capture-brands" value={draft.brand} tone={tone("brand")} onSave={(v) => set("brand", v)} disabled={locked} />
          <datalist id="capture-brands">
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <SelectField
            label="Categoría"
            value={draft.subcategory_id}
            tone={tone("subcategory_id")}
            placeholder="Elige una categoría"
            options={subcategories.map((s) => ({ value: s.id, label: `${s.parentName} › ${s.name}` }))}
            onChange={(v) => save({ subcategory_id: v, category_id: subcategories.find((s) => s.id === v)?.parentId ?? null })}
          />
        </div>
      </Section>

      <Disclosure
        title="¿Ya existe en el catálogo?"
        hint={`Ahora: ${draft.match_kind ? MATCH_LABEL[draft.match_kind] : "sin definir"}`}
        defaultOpen={needsAttention}
      >
        <SelectField
          label="Tipo"
          value={draft.match_kind}
          tone={matchTone}
          options={(Object.keys(MATCH_LABEL) as MatchKind[]).map((k) => ({ value: k, label: MATCH_LABEL[k] }))}
          onChange={(v) =>
            save({
              match_kind: v,
              ...(v === "new_product" ? { target_product_id: null, target_variant_id: null, target_draft_id: null } : {}),
            })
          }
        />
        {draft.match_kind === "new_variant" && (
          <SelectField label="Producto" value={currentProductRef} tone={tone("target_product_id")} options={productOptions} onChange={setTargetRef} />
        )}
        {draft.match_kind === "new_item" && (
          <SelectField label="Variante" value={currentVariantRef} tone={tone("target_variant_id")} options={variantOptions} onChange={setTargetRef} />
        )}
        {draft.match_reason && <p className="text-sm text-gray-600">🤖 {draft.match_reason}</p>}
      </Disclosure>
    </div>
  );
}
