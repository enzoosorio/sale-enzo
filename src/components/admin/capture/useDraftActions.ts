"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { publishDraft } from "@/actions/admin/publish";
import { discardDraft } from "@/actions/admin/staging";
import { marketplaceText } from "@/lib/staging/draftToPreview";
import type { DraftWithImages } from "@/types/staging";

/** Publish / discard / copy Marketplace text / download originals for one draft. */
export function useDraftActions(draft: DraftWithImages) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [downloading, setDownloading] = useState(false);

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

  return { pending, downloading, publish, discard, downloadOriginals, copyMarketplace };
}
