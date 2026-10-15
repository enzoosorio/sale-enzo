"use client";

import { Field, Section, SelectField } from "@/components/admin/staging/fields";
import { aiFieldProps } from "@/lib/capture/aiField";
import {
  FIT_LABELS,
  FITS,
  GENDER_LABELS,
  GENDERS,
  METADATA_KEYS,
  SIZES,
  type MetadataKey,
} from "@/lib/catalog/schema";
import { ChipSelect, Disclosure, TextField } from "../controls";
import type { StepProps } from "../types";

const META_LABEL: Record<MetadataKey, string> = {
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

/** Shown up front; the rest sit under "Más detalles". */
const PRIMARY_META: readonly MetadataKey[] = ["team", "technology", "material"];
const SECONDARY_META = METADATA_KEYS.filter((k) => !PRIMARY_META.includes(k));

export function VariantStep({ draft, locked, tone, set }: StepProps) {
  const metadata = draft.metadata as Record<string, string>;
  const setMeta = (key: MetadataKey, v: string | null) => {
    const next = { ...metadata };
    if (v) next[key] = v;
    else delete next[key];
    set("metadata", next);
  };
  // metadata is one draft field: its provenance and confidence cover every key in it.
  const metaAi = aiFieldProps(draft, "metadata", set);
  const metaField = (key: MetadataKey) => (
    <TextField
      key={key}
      label={META_LABEL[key]}
      value={metadata[key] ?? null}
      disabled={locked}
      tone={metadata[key] && tone("metadata") === "uncertain" ? "uncertain" : "ok"}
      onSave={(v) => setMeta(key, v)}
      {...(metadata[key] ? metaAi : {})}
    />
  );

  return (
    <div className="space-y-8">
      <Section title="Talla y calce">
        <div className="space-y-6">
          <ChipSelect label="Talla" value={draft.size} tone={tone("size")} {...aiFieldProps(draft, "size", set)} disabled={locked} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("size", v)} />
          <ChipSelect label="Género" value={draft.gender} tone={tone("gender")} {...aiFieldProps(draft, "gender", set)} disabled={locked} options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))} onChange={(v) => set("gender", v)} />
          <ChipSelect label="Fit" value={draft.fit} tone={tone("fit")} {...aiFieldProps(draft, "fit", set)} disabled={locked} options={FITS.map((f) => ({ value: f, label: FIT_LABELS[f] }))} onChange={(v) => set("fit", v)} />
        </div>
      </Section>

      <Section title="Detalles" subtitle={tone("metadata") === "missing" ? "Agrega al menos uno." : "Lo que hace especial a la prenda."}>
        <div className="space-y-5">{PRIMARY_META.map(metaField)}</div>
      </Section>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-800">Color</span>
        {draft.main_color_hex ? (
          <>
            <span className="h-8 w-8 rounded-full border border-gray-200" style={{ background: draft.main_color_hex }} title={draft.main_color_hex} />
            {draft.secondary_colors.map((c) => (
              <span key={c} className="h-5 w-5 rounded-full border border-gray-200" style={{ background: c }} title={c} />
            ))}
          </>
        ) : (
          <span className="text-sm text-gray-500">Se toma de la foto frontal.</span>
        )}
      </div>

      <Disclosure title="Más detalles" hint="Calce, tags y otros datos">
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Le queda desde" value={draft.fits_like_min} tone={tone("fits_like_min")} {...aiFieldProps(draft, "fits_like_min", set)} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("fits_like_min", v)} />
          <SelectField label="hasta" value={draft.fits_like_max} tone={tone("fits_like_max")} {...aiFieldProps(draft, "fits_like_max", set)} options={SIZES.map((s) => ({ value: s, label: s }))} onChange={(v) => set("fits_like_max", v)} />
        </div>
        <Field label="También unisex">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6"
            checked={draft.also_unisex}
            disabled={locked || draft.gender === "unisex"}
            onChange={(e) => set("also_unisex", e.target.checked)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{SECONDARY_META.map(metaField)}</div>
        <TextField
          label="Tags"
          hint="Separados por coma"
          value={draft.tags.join(", ")}
          tone={tone("tags")}
          {...aiFieldProps(draft, "tags", set)}
          disabled={locked}
          onSave={(v) => set("tags", (v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8))}
        />
      </Disclosure>
    </div>
  );
}
