import { redirect } from "next/navigation";

/** The storefront entry is /home (the proxy already redirects "/"); this is the fallback if it is bypassed. */
export default function RootPage() {
  redirect("/home");
}
