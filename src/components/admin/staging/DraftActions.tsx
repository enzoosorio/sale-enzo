"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Archive, Copy, Download, ExternalLink, Rocket } from "lucide-react";
import { discardDraft } from "@/actions/admin/staging";
import { publishDraft } from "@/actions/admin/publish";
import { marketplaceText } from "@/lib/staging/draftToPreview";
import type { DraftWithImages } from "@/types/staging";

/** Publish / download originals / Marketplace text / discard. */
export function DraftActions({ draft, blockers }: { draft: DraftWithImages; blockers: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const published = draft.status === "published";

  const publish = () =>
    start(async () => {
      const res = await publishDraft(draft.id);
      if (res.success) {
        toast.success(`${draft.sku} publicado`);
        router.refresh();
      } else {
        toast.error(res.error, { duration: 6000 });
      }
    });

  const discard = () => {
    if (!confirm(`¿Descartar ${draft.sku}? Podrás purgarlo después.`)) return;
    start(async () => {
      const res = await discardDraft(draft.id);
      if (res.success) router.push("/admin/staging");
      else toast.error(res.error);
    });
  };

  /** On iOS, the share sheet lets you "Save to Photos" or post to Marketplace. */
  const downloadOriginals = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/r2/download?draftId=${draft.id}`);
      const { files, error } = (await res.json()) as { files?: { name: string; url: string }[]; error?: string };
      if (!files?.length) throw new Error(error ?? "Sin originales");

      const blobs = await Promise.all(
        files.map(async (f) => new File([await (await fetch(f.url)).blob()], f.name, { type: "image/jpeg" })),
      );
      if (navigator.canShare?.({ files: blobs })) {
        await navigator.share({ files: blobs, title: draft.name ?? draft.sku });
      } else {
        for (const file of blobs) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file);
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const copyMarketplace = async () => {
    await navigator.clipboard.writeText(marketplaceText(draft));
    toast.success("Texto copiado");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copyMarketplace} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm">
        <Copy className="w-4 h-4" /> Marketplace
      </button>
      <button
        type="button"
        onClick={downloadOriginals}
        disabled={downloading || draft.images.length === 0}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40"
      >
        <Download className="w-4 h-4" /> {downloading ? "Preparando…" : "Originales"}
      </button>
      {!published && draft.status !== "discarded" && (
        <button type="button" onClick={discard} disabled={pending} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-red-700">
          <Archive className="w-4 h-4" /> Descartar
        </button>
      )}
      {published ? (
        <a
          href={`/products/${draft.published_product_id}?variant=${draft.published_variant_id}`}
          target="_blank"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" /> Ver en la tienda
        </a>
      ) : (
        <button
          type="button"
          onClick={publish}
          disabled={pending || blockers.length > 0}
          title={blockers.join("\n")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40"
        >
          <Rocket className="w-4 h-4" /> {pending ? "Publicando…" : "Publicar"}
        </button>
      )}
    </div>
  );
}
