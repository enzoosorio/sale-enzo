
import { UserRow } from "@/types/user/users";

type EmailState = 
  | { state: "not-verified" }
  | { state: "verified" }
  | { state: "no-user" };

/**
 * Verifica el estado de verificación del email de un usuario
 * 
 * @param user - Usuario parcial o null
 * @returns Estado del email
 */
export function assertEmailState(
  user: Partial<UserRow> | null | undefined
): EmailState {
  if (!user) {
    return { state: "no-user" };
  }

  if (user.verified_email === false) {
    return { state: "not-verified" };
  }

  return { state: "verified" };
}
