/**
 * Helper para construir respuestas con redirección
 * 
 * Útil para Server Actions que necesitan indicar al cliente
 * que debe redirigir a otra página
 */

import { AuthResponse } from "@/lib/auth/schemas";

type AuthResponseWithRedirect = AuthResponse & {
  redirect?: string;
};

/**
 * Crea una respuesta de error con sugerencia de redirección
 * 
 * @param message - Mensaje de error
 * @param redirectTo - Ruta a la que se sugiere redirigir
 * @returns AuthResponse con redirect
 */
export function createErrorWithRedirect(
  message: string,
  redirectTo: string
): AuthResponseWithRedirect {
  return {
    status: "error",
    message,
    redirect: redirectTo,
  };
}

/**
 * Crea una respuesta exitosa con redirección
 * 
 * @param message - Mensaje de éxito
 * @param redirectTo - Ruta a la que redirigir
 * @returns AuthResponse con redirect
 */
export function createSuccessWithRedirect(
  message: string,
  redirectTo: string
): AuthResponseWithRedirect {
  return {
    status: "success",
    message,
    redirect: redirectTo,
  };
}
