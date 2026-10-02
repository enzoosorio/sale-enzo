import type { ShotRole } from "@/lib/catalog/schema";

const SHIRT_FRONT = "M35 12 L12 26 L22 44 L30 39 L30 88 L70 88 L70 39 L78 44 L88 26 L65 12 Q50 26 35 12 Z";
const SHIRT_BACK = "M35 12 L12 26 L22 44 L30 39 L30 88 L70 88 L70 39 L78 44 L88 26 L65 12 Q50 17 35 12 Z";

/** Line-art placeholder showing what each shot should look like. Inherits color from `currentColor`. */
export function SlotArt({ role, className }: { role: ShotRole; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {role === "front" && <path d={SHIRT_FRONT} />}
      {role === "back" && (
        <>
          <path d={SHIRT_BACK} />
          <path d="M50 17 V40" strokeDasharray="3 4" />
        </>
      )}
      {role === "label" && (
        <>
          <path d="M30 22 H70 V72 L50 84 L30 72 Z" />
          <circle cx="50" cy="32" r="3.5" />
          <path d="M40 48 H60 M40 58 H60 M44 68 H56" />
        </>
      )}
      {role === "detail" && (
        <>
          <circle cx="44" cy="44" r="26" />
          <path d="M63 63 L84 84" />
          <path d="M34 50 L44 34 L54 50 Z" />
        </>
      )}
      {role === "defect" && (
        <>
          <path d={SHIRT_FRONT} strokeDasharray="2 5" opacity="0.55" />
          <circle cx="56" cy="58" r="11" />
          <path d="M51 53 L61 63 M61 53 L51 63" />
        </>
      )}
      {role === "extra" && (
        <>
          <rect x="22" y="22" width="56" height="56" rx="10" strokeDasharray="4 5" />
          <path d="M50 38 V62 M38 50 H62" />
        </>
      )}
    </svg>
  );
}
