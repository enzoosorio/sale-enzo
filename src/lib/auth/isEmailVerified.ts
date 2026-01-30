import { createClient } from "@/utils/supabase/server";

/**
 * Verifica si un usuario ha confirmado su email en Supabase Auth
 * 
 * Esta función consulta directamente auth.users para verificar email_confirmed_at
 * Útil como verificación adicional en login
 * 
 * @param userId - ID del usuario a verificar
 * @returns true si el email está verificado, false si no
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Obtener el usuario de Supabase Auth
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user) {
      console.error("Error verificando estado de email:", error);
      return false;
    }
    
    // Verificar si email_confirmed_at tiene valor (no es null)
    return !!user.email_confirmed_at;
    
  } catch (error) {
    console.error("Error inesperado en isEmailVerified:", error);
    return false;
  }
}
