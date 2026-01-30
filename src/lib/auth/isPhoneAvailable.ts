import { supabaseAdmin as supabase } from "@/utils/supabase/supabase-admin";

/**
 * Verifica si un número de teléfono está disponible (no está en uso)
 * 
 * @param phone - Número de teléfono a verificar (opcional)
 * @returns true si está disponible, false si ya está en uso
 */
export async function isPhoneAvailable(
  phone?: string
): Promise<boolean> {
  // Si no se proporciona teléfono, está "disponible"
  if (!phone) return true;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("Error verificando teléfono:", error);
      return false; // Por seguridad, asumir no disponible si hay error
    }

    // Si NO hay data, el teléfono está disponible
    // Si hay data, el teléfono ya está en uso
    return !data;
  } catch (error) {
    console.error("Error inesperado en isPhoneAvailable:", error);
    return false;
  }
}
