"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { updateDraft, type DraftUpdate } from "@/actions/admin/staging";
import {
  DEFECT_SEVERITIES,
  DEFECT_TYPES,
  FIT_LABELS,
  FITS,
  GENDER_LABELS,
  GENDERS,
  METADATA_KEYS,
  SIZES,
  type Defect,
  type DraftFields,
  type MatchKind,
} from "@/lib/catalog/schema";
import type { CatalogProduct, TaxonomyNode } from "@/lib/catalog/extract";
import type { DraftWithImages } from "@/types/staging";
import { Field, inputClass, Section, SelectField, type FieldTone } from "./fields";
import { PhotoManager } from "./PhotoManager";
import { VoiceBar } from "./VoiceBar";

const META_LABEL: Record<(typeof METADATA_KEYS)[number], string> = {
  team: "Equipo",
  university: "Universidad",
  league: "Liga",
  player: "Jugador",
  number: "Número",
  technology: "Tecnología",
  edition: "Edición",
  collection: "Colección",
  sport: "Deporte",
  use: "Uso (deporte / salir)",
  material: "Material",
};

const DEFECT_LABEL: Record<Defect["type"], string> = {
  hole: "Agujero",
  stain: "Mancha",
  pilling: "Motas",
  fading: "Decoloración",
  wear: "Desgaste",
  pull: "Jalón",
  other: "Otro",
};
const SEVERITY_LABEL: Record<Defect["severity"], string> = { minimal: "Mínimo", mild: "Leve", noticeable: "Visible" };

const MATCH_LABEL: Record<MatchKind, string> = {
  new_product: "Producto nuevo",
  new_variant: "Nueva variante de un producto",
  new_item: "Otra unidad de una variante",
};

const CONDITION_OPTIONS = Array.from({ length: 19 }, (_, i) => 10 - i * 0.5);

interface Props {
  draft: DraftWithImages;
  taxonomy: TaxonomyNode[];
  brands: string[];
  catalog: CatalogProduct[];
}

export function DraftEditor({ draft: initial, taxonomy, brands, catalog }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saving, startSaving] = useTransition();
  const [warnings, setWarnings] = useState<string[]>(
    ((initial.ai_raw as { warnings?: string[] } | null)?.warnings ?? []).filter(Boolean),
  );
  const [generating, setGenerating] = useState(false);
  const locked = draft.status === "published" || draft.status === "discarded";

  // Server refresh (router.refresh after photo processing) replaces local state
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setDraft(initial);
  }

  const tone = useCallback(
    (key: string): FieldTone => {
      if (draft.missing_fields.includes(key)) return "missing";
      const confidenceKey = key === "condition_score" ? key : key.replace(/_id$/, "");
      return (draft.field_confidence[confidenceKey] ?? 1) < 0.6 ? "uncertain" : "ok";
    },
    [draft.missing_fields, draft.field_confidence],
  );

  const save = useCallback(
    (patch: DraftUpdate) => {
      setDraft((d) => ({ ...d, ...patch }) as DraftWithImages);
      startSaving(async () => {
        const res = await updateDraft(draft.id, patch);
        if (res.success) setDraft(res.data);
        else toast.error(res.error);
      });
    },
    [draft.id],
  );

  const set = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => save({ [key]: value } as DraftUpdate);

  const subcategories = useMemo(
    () => taxonomy.flatMap((c) => c.children.map((s) => ({ ...s, parentId: c.id, parentName: c.name }))),
    [taxonomy],
  );

  const generateCopy = async () => {
    setGenerating(true);
    const res = await fetch("/api/admin/copy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId: draft.id }),
    });
    const body = await res.json();
    setGenerating(false);
    if (!res.ok) return toast.error(body.error ?? "No se pudo generar");
    setDraft((d) => ({ ...d, description: body.description, condition_note: body.condition_note }));
    if (body.issues?.length) toast(`Revisa el texto: ${body.issues.join(", ")}`, { icon: "⚠️" });
  };

  const productOptions = catalog.map((p) => ({ value: p.ref, label: `${p.name}${p.ref.startsWith("dp:") ? " (borrador)" : ""}` }));
  const currentProductRef = draft.target_draft_id && draft.match_kind === "new_variant"
    ? `dp:${draft.target_draft_id}`
    : draft.target_product_id ? `p:${draft.target_product_id}` : null;
  const variantOptions = catalog.flatMap((p) =>
    p.variants.map((v) => ({
      value: v.ref,
      label: `${p.name} · ${v.size ?? "?"} · ${v.gender ?? "?"}${v.ref.startsWith("dv:") ? " (borrador)" : ""}`,
    })),
  );
  const currentVariantRef = draft.target_draft_id && draft.match_kind === "new_item"
    ? `dv:${draft.target_draft_id}`
    : draft.target_variant_id ? `v:${draft.target_variant_id}` : null;

  const setTargetRef = (ref: string | null) => {
    const [kind, id] = ref?.split(":") ?? [];
    save({
      target_product_id: kind === "p" ? id : null,
      target_variant_id: kind === "v" ? id : null,
      target_draft_id: kind === "dp" || kind === "dv" ? id : null,
    });
  };

  return (
    <div className="space-y-5">
      {!locked && (
        <VoiceBar
          draftId={draft.id}
          onDraft={(d, w) => {
            setDraft(d);
            setWarnings(w);
          }}
        />
      )}

      {warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
          {warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      )}

      <Section title="Fotos" subtitle="Mínimo 2 procesadas para publicar. La ★ es la principal y define el color.">
        <PhotoManager draftId={draft.id} images={draft.images} onChange={() => router.refresh()} disabled={locked} />
      </Section>

      <Section title="Segmentación" subtitle="Dónde entra en el catálogo: producto → variante → unidad.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo"
            value={draft.match_kind}
            tone={tone("match_kind") === "ok" ? tone("match") : tone("match_kind")}
            options={(Object.keys(MATCH_LABEL) as MatchKind[]).map((k) => ({ value: k, label: MATCH_LABEL[k] }))}
            onChange={(v) => save({ match_kind: v, ...(v === "new_product" ? { target_product_id: null, target_variant_id: null, target_draft_id: null } : {}) })}
          />
          {draft.match_kind === "new_variant" && (
            <SelectField label="Producto" value={currentProductRef} tone={tone("target_product_id")} options={productOptions} onChange={setTargetRef} />
          )}
          {draft.match_kind === "new_item" && (
            <SelectField label="Variante" value={currentVariantRef} tone={tone("target_variant_id")} options={variantOptions} onChange={setTargetRef} />
          )}
        </div>
        {draft.match_reason && <p className="text-sm text-gray-600">🤖 {draft.match_reason}</p>}
      </Section>

      <Section title="Producto">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre" value={draft.name} tone={tone("name")} onSave={(v) => set("name", v)} disabled={locked} />
          <SelectField
            label="Marca"
            value={draft.brand}
            tone={tone("brand")}
            options={brands.map((b) => ({ value: b, label: b }))}
            onChange={(v) => set("brand", v)}
          />
          <SelectField
            label="Subcategoría"
            value={draft.subcategory_id}
            tone={tone("subcategory_id")}
            options={subcategories.map((s) => ({ value: s.id, label: `${s.parentName} › ${s.name}` }))}
            onChange={(v) => save({ subcategory_id: v, category_id: subcategories.find((s) => s.id === v)?.parentId ?? null })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Textos públicos</span>
          <button
            type="button"
            onClick={generateCopy}
            disabled={locked || generating}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" /> {generating ? "Generando…" : "Generar con IA"}
          </button>
        </div>
        <TextField label="Descripción" multiline value={draft.description} onSave={(v) => set("description", v)} disabled={locked} />
        <TextField
          label="Nota de estado (pública)"
          hint="Menciona los defectos con tacto. Nunca los omitas."
          multiline
          value={draft.condition_note}
          tone={draft.defects.length > 0 && !draft.condition_note ? "missing" : "ok"}
          onSave={(v) => set("condition_note", v)}
          disabled={locked}
        />
      </Section>

      <Section title="Variante">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <SelectField label="Talla" value={draft.size} tone={tone("size")} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("size", v)} />
          <SelectField label="Género" value={draft.gender} tone={tone("gender")} options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))} onChange={(v) => set("gender", v)} />
          <SelectField label="Fit" value={draft.fit} tone={tone("fit")} options={FITS.map((f) => ({ value: f, label: FIT_LABELS[f] }))} onChange={(v) => set("fit", v)} />
          <SelectField label="Le queda desde" value={draft.fits_like_min} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("fits_like_min", v)} />
          <SelectField label="hasta" value={draft.fits_like_max} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("fits_like_max", v)} />
          <Field label="También unisex">
            <input
              type="checkbox"
              className="w-6 h-6 mt-2"
              checked={draft.also_unisex}
              disabled={draft.gender === "unisex"}
              onChange={(e) => set("also_unisex", e.target.checked)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Color</span>
          {draft.main_color_hex ? (
            <>
              <span className="w-8 h-8 rounded-full border border-gray-300" style={{ background: draft.main_color_hex }} title={draft.main_color_hex} />
              {draft.secondary_colors.map((c) => (
                <span key={c} className="w-5 h-5 rounded-full border border-gray-300" style={{ background: c }} title={c} />
              ))}
            </>
          ) : (
            <span className="text-sm text-red-600">Se calcula de la foto principal</span>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className={`text-sm font-medium ${tone("metadata") === "missing" ? "text-red-600" : "text-gray-700"}`}>
            Metadata {tone("metadata") === "missing" && "· agrega al menos una"}
          </legend>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {METADATA_KEYS.map((key) => (
              <TextField
                key={key}
                label={META_LABEL[key]}
                value={(draft.metadata as Record<string, string>)[key] ?? null}
                disabled={locked}
                onSave={(v) => {
                  const next = { ...(draft.metadata as Record<string, string>) };
                  if (v) next[key] = v;
                  else delete next[key];
                  set("metadata", next);
                }}
              />
            ))}
          </div>
        </fieldset>

        <TextField
          label="Tags"
          hint="Separados por coma"
          value={draft.tags.join(", ")}
          disabled={locked}
          onSave={(v) => set("tags", (v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8))}
        />
      </Section>

      <Section title="Unidad (item)">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <SelectField
            label="Estado /10"
            value={draft.condition_score !== null ? String(Number(draft.condition_score)) : null}
            tone={tone("condition_score")}
            options={CONDITION_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => set("condition_score", v === null ? null : Number(v))}
          />
          <NumberField label="Precio S/" value={draft.price} tone={tone("price")} onSave={(v) => set("price", v)} disabled={locked} />
          <NumberField label="Precio antes S/" value={draft.compare_at_price} onSave={(v) => set("compare_at_price", v)} disabled={locked} />
          <NumberField label="Stock" value={draft.stock} step={1} onSave={(v) => set("stock", v ?? 1)} disabled={locked} />
        </div>
      </Section>

      <Section title="Privado" subtitle="Solo lo ves tú. No llega a la tienda.">
        <DefectsEditor defects={draft.defects} disabled={locked} onChange={(d) => set("defects", d)} />
        <TextField label="Especificaciones (crudo)" multiline value={draft.specs_raw} onSave={(v) => set("specs_raw", v)} disabled={locked} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Notas de precio" value={draft.price_notes} onSave={(v) => set("price_notes", v)} disabled={locked} />
          <TextField label="Notas internas" value={draft.internal_notes} onSave={(v) => set("internal_notes", v)} disabled={locked} />
        </div>
      </Section>

      <p className="text-xs text-gray-500 text-right" aria-live="polite">
        {saving ? "Guardando…" : "Guardado"}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onSave,
  tone,
  hint,
  multiline,
  disabled,
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
  tone?: FieldTone;
  hint?: string;
  multiline?: boolean;
  disabled?: boolean;
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
        <textarea className={`${inputClass(tone)} min-h-24`} value={local} disabled={disabled} onChange={(e) => setLocal(e.target.value)} onBlur={commit} />
      ) : (
        <input className={inputClass(tone)} value={local} disabled={disabled} onChange={(e) => setLocal(e.target.value)} onBlur={commit} />
      )}
    </Field>
  );
}

function NumberField({
  label,
  value,
  onSave,
  tone,
  step = 0.5,
  disabled,
}: {
  label: string;
  value: number | null;
  onSave: (value: number | null) => void;
  tone?: FieldTone;
  step?: number;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value === null ? "" : String(Number(value)));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setLocal(value === null ? "" : String(Number(value)));
  }
  return (
    <Field label={label} tone={tone}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        className={inputClass(tone)}
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const next = local === "" ? null : Number(local);
          if (next !== (value === null ? null : Number(value))) onSave(next);
        }}
      />
    </Field>
  );
}

function DefectsEditor({ defects, onChange, disabled }: { defects: Defect[]; onChange: (d: Defect[]) => void; disabled?: boolean }) {
  const update = (i: number, patch: Partial<Defect>) => onChange(defects.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Defectos</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...defects, { type: "other", zone: "", severity: "mild", note: null }])}
          className="flex items-center gap-1 text-sm px-2 py-1 rounded border border-gray-300 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
      {defects.length === 0 && <p className="text-sm text-gray-500">Sin defectos registrados.</p>}
      {defects.map((d, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
          <select className={inputClass()} value={d.type} disabled={disabled} onChange={(e) => update(i, { type: e.target.value as Defect["type"] })}>
            {DEFECT_TYPES.map((t) => (
              <option key={t} value={t}>{DEFECT_LABEL[t]}</option>
            ))}
          </select>
          <input
            className={inputClass(d.zone ? "ok" : "missing")}
            placeholder="Zona"
            defaultValue={d.zone}
            disabled={disabled}
            onBlur={(e) => e.target.value !== d.zone && update(i, { zone: e.target.value })}
          />
          <select className={inputClass()} value={d.severity} disabled={disabled} onChange={(e) => update(i, { severity: e.target.value as Defect["severity"] })}>
            {DEFECT_SEVERITIES.map((s) => (
              <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
            ))}
          </select>
          <button type="button" disabled={disabled} onClick={() => onChange(defects.filter((_, j) => j !== i))} className="p-2 text-red-600" aria-label="Quitar defecto">
            <Trash2 className="w-4 h-4" />
          </button>
          {d.note && <p className="col-span-4 text-xs text-gray-500 -mt-1">{d.note}</p>}
        </div>
      ))}
    </div>
  );
}
