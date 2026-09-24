"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { createDraft } from "@/actions/admin/staging";

/** Creates the draft instantly: it reserves the SKU used for the R2 paths. */
export function NewDraftButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createDraft("voice");
          if (res.success) router.push(`/admin/staging/${res.data.id}`);
          else toast.error(res.error);
        })
      }
      className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl bg-gray-900 text-white text-lg font-medium disabled:opacity-50"
    >
      <Plus className="w-6 h-6" /> {pending ? "Creando…" : "Nuevo producto"}
    </button>
  );
}
