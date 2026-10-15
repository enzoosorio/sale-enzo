import { MIN_DONE_IMAGES } from "@/lib/catalog/schema";

export const WIZARD_STEPS = [
  { key: "photos", label: "Fotos", description: "Frente, espalda y detalles" },
  { key: "product", label: "Producto", description: "Nombre, marca y categoría" },
  { key: "variant", label: "Variante", description: "Talla, género, fit y detalles" },
  { key: "price", label: "Precio", description: "Estado, precio y textos" },
  { key: "review", label: "Revisar", description: "Checklist y publicar" },
] as const;

export type StepKey = (typeof WIZARD_STEPS)[number]["key"];

/**
 * Which `missing_fields` entries (see computeMissingFields) each step can fix.
 * The color comes from the front photo, so it lives with the photos.
 */
export const STEP_FIELDS: Record<Exclude<StepKey, "review">, readonly string[]> = {
  photos: ["main_color_hex"],
  product: ["name", "brand", "category_id", "subcategory_id", "match_kind", "target_product_id", "target_variant_id"],
  variant: ["size", "gender", "fit", "metadata"],
  price: ["condition_score", "price"],
};

export const FIELD_LABEL: Record<string, string> = {
  match_kind: "Tipo de producto",
  target_product_id: "Producto base",
  target_variant_id: "Variante base",
  name: "Nombre",
  brand: "Marca",
  category_id: "Categoría",
  subcategory_id: "Categoría",
  size: "Talla",
  gender: "Género",
  fit: "Fit",
  metadata: "Algún detalle (equipo, tecnología…)",
  main_color_hex: "Color (se toma de la foto frontal)",
  condition_score: "Estado",
  price: "Precio",
  tags: "Tags",
  defects: "Defectos",
  fits_like_min: "Calce (desde)",
  fits_like_max: "Calce (hasta)",
  photos: "Al menos 2 fotos procesadas",
};

/** Human labels of what a step still needs, without duplicates. */
export function stepMissing(step: StepKey, missingFields: readonly string[], doneImages: number): string[] {
  if (step === "review") return [];
  const keys = missingFields.filter((f) => STEP_FIELDS[step].includes(f));
  if (step === "photos" && doneImages < MIN_DONE_IMAGES) keys.unshift("photos");
  return [...new Set(keys.map((k) => FIELD_LABEL[k] ?? k))];
}

export type StepStatus = "ok" | "pending";

export function stepStatus(step: StepKey, missingFields: readonly string[], doneImages: number): StepStatus {
  if (step === "review") {
    const anyPending = WIZARD_STEPS.some((s) => s.key !== "review" && stepMissing(s.key, missingFields, doneImages).length);
    return anyPending ? "pending" : "ok";
  }
  return stepMissing(step, missingFields, doneImages).length ? "pending" : "ok";
}

export function parseStep(value: string | null | undefined): StepKey | null {
  return WIZARD_STEPS.find((s) => s.key === value)?.key ?? null;
}
