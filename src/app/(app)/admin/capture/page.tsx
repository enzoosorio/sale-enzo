import { redirect } from "next/navigation";

/**
 * PWA start_url and old links. "Capturar" goes straight to the form; in-progress
 * drafts are resumed from Staging → Capturando.
 */
export default function CapturePage() {
  redirect("/admin/capture/new");
}
