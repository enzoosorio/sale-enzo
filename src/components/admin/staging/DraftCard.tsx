"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Archive, ExternalLink, Maximize2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteDraft, discardDraft, type DraftListItem } from "@/actions/admin/staging";
import { MIN_DONE_IMAGES } from "@/lib/catalog/schema";
import { mediaUrl } from "@/lib/images/media";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { PhotoViewer } from "./PhotoViewer";

const MATCH_SHORT: Record<string, string> = { new_product: "Producto", new_variant: "Variante", new_item: "Unidad" };

/** Staging card. Right-click (or the ⋯ button, for touch) opens its actions. */
export function DraftCard({ draft: d }: { draft: DraftListItem }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [viewing, setViewing] = useState(false);
  const closeMenu = useCallback(() => setMenu(null), []);

  const thumb = mediaUrl(d.main_web_key);
  const complete = d.missing_fields.length === 0 && d.done_images >= MIN_DONE_IMAGES;
  const href = `/admin/staging/${d.id}`;
  const label = d.name ?? d.sku;

  const run = (fn: () => Promise<{ success: boolean } & { error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.success) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(res.error ?? "No se pudo completar la acción");
      }
    });

  const items: ContextMenuItem[] = [
    { key: "open", label: "Abrir", icon: <Pencil className="h-4 w-4" />, onSelect: () => router.push(href) },
    { key: "tab", label: "Abrir en pestaña nueva", icon: <ExternalLink className="h-4 w-4" />, onSelect: () => window.open(href, "_blank") },
    {
      key: "photos",
      label: d.photo_keys.length ? `Ver fotos (${d.photo_keys.length})` : "Ver fotos (sin fotos)",
      icon: <Maximize2 className="h-4 w-4" />,
      disabled: d.photo_keys.length === 0,
      onSelect: () => setViewing(true),
    },
    {
      key: "discard",
      label: "Descartar",
      icon: <Archive className="h-4 w-4" />,
      separated: true,
      disabled: d.status === "published" || d.status === "discarded",
      onSelect: () => confirm(`¿Descartar ${d.sku}? Pasa a Descartados.`) && run(() => discardDraft(d.id), `${d.sku} descartado`),
    },
    {
      key: "delete",
      label: "Eliminar definitivamente",
      icon: <Trash2 className="h-4 w-4" />,
      tone: "danger",
      disabled: d.status === "published",
      onSelect: () =>
        confirm(`¿Eliminar ${d.sku} para siempre? Se borran también sus fotos. No se puede deshacer.`) &&
        run(() => deleteDraft(d.id), `${d.sku} eliminado`),
    },
  ];

  return (
    <li
      className="relative"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <Link href={href} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 pr-10 hover:border-gray-400">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {thumb ? (
            <Image src={thumb} alt="" fill sizes="80px" className="object-contain" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-xs text-gray-400">Sin foto</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-gray-500">
            {d.sku} · {d.match_kind ? MATCH_SHORT[d.match_kind] : "Sin segmentar"}
          </p>
          <p className="line-clamp-2 font-medium text-gray-900">{d.name ?? "Sin nombre"}</p>
          <p className="text-sm text-gray-600">{[d.brand, d.size, d.price ? `S/ ${d.price}` : null].filter(Boolean).join(" · ")}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {d.status === "published" ? (
              <Badge tone="green">Publicado</Badge>
            ) : d.status === "discarded" ? (
              <Badge tone="gray">Descartado</Badge>
            ) : complete ? (
              <Badge tone="green">Listo</Badge>
            ) : d.is_empty ? (
              <Badge tone="gray">Vacío</Badge>
            ) : (
              <>
                {d.done_images < MIN_DONE_IMAGES && (
                  <Badge tone="red">
                    {d.done_images}/{MIN_DONE_IMAGES} fotos
                  </Badge>
                )}
                {d.missing_fields.length > 0 && <Badge tone="red">Faltan {d.missing_fields.length}</Badge>}
              </>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Acciones de ${label}`}
        aria-haspopup="menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: r.right - 240, y: r.bottom + 4 });
        }}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}
      {viewing && <PhotoViewer keys={d.photo_keys} title={label} onClose={() => setViewing(false)} />}
    </li>
  );
}

function Badge({ tone, children }: { tone: "green" | "red" | "gray"; children: React.ReactNode }) {
  const cls = { green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-700", gray: "bg-gray-100 text-gray-600" }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}
