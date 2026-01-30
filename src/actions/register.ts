"use server";

import { assertEmailState } from "@/lib/auth/assertEmailState";
import { getUserByEmail } from "@/lib/auth/getUserByEmail";
import { isPhoneAvailable } from "@/lib/auth/isPhoneAvailable";
import { registerSchema, type AuthResponse } from "@/lib/auth/schemas";
import { createClient } from "@/utils/supabase/server";

/**
 * Server Action para registro de usuario
 * 
 * FLUJO:
 * 1. Validar datos con Zod
 * 2. Verificar si el email ya existe
 * 3. Verificar si el teléfono está disponible
 * 4. Crear usuario en Supabase Auth (esto dispara el trigger)
 * 5. El trigger copia id, email, avatar_url a public.users
 * 6. Actualizar campos adicionales (first_name, last_name, phone, verified_email)
 * 
 * @param formData - Datos del formulario
 * @returns AuthResponse con status y mensaje
 */
export async function registerUser(
  formData: FormData
): Promise<AuthResponse> {
  try {
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      first_name: (formData.get("first_name") as string) || undefined,
      last_name: (formData.get("last_name") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
    };

    const validationResult = registerSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      
      return {
        status: "error",
        message: `Error de validación: ${errors}`,
      };
    }

    const validatedData = validationResult.data;

    // ============================================
    // 2. VERIFICAR SI EL EMAIL YA EXISTE
    // ============================================
    const existingUser = await getUserByEmail(validatedData.email);
    
    if (existingUser) {
      const emailState = assertEmailState(existingUser);
      
      // Si el email existe pero no está verificado
      if (emailState.state === "not-verified") {
        return {
          status: "error",
          message: `El email ${validatedData.email} ya está registrado pero no verificado. Por favor revisa tu correo para verificar tu cuenta.`,
        };
      }
      
      // Si el email existe y está verificado
      if (emailState.state === "verified") {
        return {
          status: "error",
          message: `El email ${validatedData.email} ya está registrado. ¿Deseas iniciar sesión?`,
        };
      }
    }

    // ============================================
    // 3. VERIFICAR SI EL TELÉFONO ESTÁ DISPONIBLE
    // ============================================
    if (validatedData.phone) {
      const phoneAvailable = await isPhoneAvailable(validatedData.phone);
      
      if (!phoneAvailable) {
        return {
          status: "error",
          message: `El teléfono ${validatedData.phone} ya está en uso por otra cuenta.`,
        };
      }
    }

    // ============================================
    // 4. CREAR USUARIO EN SUPABASE AUTH
    // ============================================
    const supabase = await createClient();
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      phone: validatedData.phone,
      options: {
        // Estos datos van a auth.users.raw_user_meta_data
        // pero NO se copian automáticamente a public.users
        data: {
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          phone: validatedData.phone,
        },
      },
    });
    
    if (authError) {
      console.error("Error en Supabase Auth:", authError);
      return {
        status: "error",
        message: authError.message || "Error al crear la cuenta. Intenta de nuevo.",
      };
    }

    if (!authData.user) {
      return {
        status: "error",
        message: "No se pudo crear el usuario. Intenta de nuevo.",
      };
    }

    return {
      status: "success",
      message: "¡Registro exitoso! Por favor verifica tu email para activar tu cuenta.",
    };

  } catch (error) {
    console.error("Error inesperado en registerUser:", error);
    return {
      status: "error",
      message: "Error inesperado durante el registro. Por favor intenta de nuevo.",
    };
  }
}
