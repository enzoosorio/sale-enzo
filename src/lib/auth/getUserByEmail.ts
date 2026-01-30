import { UserRow } from "@/types/user/users";
import { supabaseAdmin as supabase } from "@/utils/supabase/supabase-admin";
/**
 * Obtiene un usuario de la tabla pública 'users' por email
 * 
 * @param email - Email del usuario a buscar
 * @returns Usuario encontrado o null si no existe
 */
export async function getUserByEmail(
  email: string
): Promise<Partial<UserRow> | null> {
  try {
    // const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("users")
      .select("id, email, verified_email, phone, first_name, last_name")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Error en getUserByEmail:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error inesperado en getUserByEmail:", error);
    return null;
  }
}
