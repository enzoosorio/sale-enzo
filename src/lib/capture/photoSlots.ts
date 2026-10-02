import { SHOT_ROLES, type ShotRole } from "@/lib/catalog/schema";

export interface PhotoSlot {
  role: ShotRole;
  label: string;
  hint: string;
  required: boolean;
}

/**
 * Photo slots shown in the capture wizard. Front + back are required and match
 * MIN_DONE_IMAGES; the rest are optional extras that help the buyer.
 */
export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  { role: "front", label: "Frente", hint: "Prenda completa, de frente. Define el color.", required: true },
  { role: "back", label: "Espalda", hint: "Prenda completa, por detrás.", required: true },
  { role: "label", label: "Etiqueta", hint: "Talla y composición.", required: false },
  { role: "detail", label: "Detalle", hint: "Logo, estampado o tela.", required: false },
  { role: "defect", label: "Defecto", hint: "Cualquier marca o desgaste.", required: false },
  { role: "extra", label: "Otra", hint: "Lo que quieras mostrar.", required: false },
];

export const EXTRA_SLOT = PHOTO_SLOTS[PHOTO_SLOTS.length - 1];
export const REQUIRED_SLOTS = PHOTO_SLOTS.filter((s) => s.required);
export const OPTIONAL_SLOTS = PHOTO_SLOTS.filter((s) => !s.required);

export const slotLabel = (role: ShotRole): string => PHOTO_SLOTS.find((s) => s.role === role)?.label ?? role;

/** Display rank of a role; unassigned photos go last. */
export function roleRank(role: ShotRole | null): number {
  return role === null ? SHOT_ROLES.length : SHOT_ROLES.indexOf(role);
}

/** Roles that hold a single photo. `extra` can hold many. */
export const isSingleSlot = (role: ShotRole): boolean => role !== "extra";
