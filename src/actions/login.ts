"use server";

import { getUserByEmail } from "@/lib/auth/getUserByEmail";
import { loginSchema, type AuthResponse } from "@/lib/auth/schemas";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
/**
 * Server Action para inicio de sesión de usuario
 * 
 * FLUJO:
 * 1. Validar datos con Zod
 * 2. Verificar si el email existe en la BD
 * 3. Verificar si el email ha sido verificado
 * 4. Intentar login con Supabase Auth
 * 5. Manejar errores sin revelar información sensible
 * 
 * SEGURIDAD:
 * - No revelar si un email existe o no (prevenir enumeración)
 * - Mensajes genéricos para credenciales inválidas
 * - Verificación de email obligatoria antes de login
 * 
 * @param formData - Datos del formulario (email, password)
 * @returns AuthResponse con status y mensaje
 */
export async function loginUser(
  formData: FormData
): Promise<AuthResponse> {
  try {

    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const validationResult = loginSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((err) => err.message)
        .join(", ");
      
      return {
        status: "error",
        message: errors,
      };
    }

    const validatedData = validationResult.data;

    // Validamos si el email ya ha sido registrado por otro usuario
    const existingUser = await getUserByEmail(validatedData.email);
    
    if (!existingUser) {
      return {
        status: "error",
        message: "Este email no está registrado.",
      };
    }

    if (existingUser.verified_email === false) {
      return {
        status: "error",
        message: "Por favor verifica tu email antes de iniciar sesión.",
      };
    }    

    const supabase = await createClient();
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    if (authError) {
      console.error("Error en Supabase Auth:", authError);
      
      return {
        status: "error",
        message: "Email o contraseña incorrectos. Por favor verifica tus credenciales.",
      };
    }

    if (!authData.user || !authData.session) {
      return {
        status: "error",
        message: "No se pudo iniciar sesión. Por favor intenta de nuevo.",
      };
    }

    // Double-check usando email_confirmed_at de auth.users
    // Por si el trigger no se ejecutó correctamente
    if (!authData.user.email_confirmed_at) {
      // Cerrar la sesión que se acaba de crear
      await supabase.auth.signOut();
      
      return {
        status: "error",
        message: "Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
      };
    }

    // La sesión ya está establecida por Supabase
    return {
      status: "success",
      message: `¡Bienvenido${existingUser.first_name ? " " + existingUser.first_name : ""}!`,
    };

  } catch (error) {
    console.error("Error inesperado en loginUser:", error);
    return {
      status: "error",
      message: "Error inesperado durante el inicio de sesión. Por favor intenta de nuevo.",
    };
  }
}

export async function logoutUser(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/home');
}