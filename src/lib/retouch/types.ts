/**
 * "Planchado": smooths the small wrinkles left after ironing a garment.
 * It is a generative edit, so a provider must never be trusted blindly: the
 * result goes through an automatic comparison and the owner's approval.
 */

export type RetouchProviderName = "gemini" | "photoroom";

export interface RetouchImage {
  bytes: Uint8Array;
  /** image/jpeg | image/png | image/webp */
  mime: string;
}

export interface RetouchProvider {
  readonly name: RetouchProviderName;
  iron(input: RetouchImage): Promise<RetouchImage>;
}

/** Network or provider failure. Calls that fail are not billed by either provider. */
export class RetouchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
