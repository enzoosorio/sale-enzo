import "server-only";
import { geminiProvider } from "./gemini";
import { photoroomProvider } from "./photoroom";
import type { RetouchProvider, RetouchProviderName } from "./types";

export { RetouchError } from "./types";
export type { RetouchImage, RetouchProvider, RetouchProviderName } from "./types";

/** Provider chosen by RETOUCH_PROVIDER (default: gemini). */
export function retouchProvider(name = process.env.RETOUCH_PROVIDER): RetouchProvider {
  return (name as RetouchProviderName | undefined) === "photoroom" ? photoroomProvider() : geminiProvider();
}
