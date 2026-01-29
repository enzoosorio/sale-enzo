"use server";

import { registerSchema, type AuthResponse } from "@/lib/auth/schemas";

/**
 * Server Action para registro de usuario
 * 
 * Esta función está preparada para conectarse con Supabase Auth.
 * 
 * PRÓXIMOS PASOS PARA IMPLEMENTACIÓN COMPLETA:
 * 1. Descomentar imports de Supabase
 * 2. Configurar variables de entorno:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 3. Implementar lógica de creación de usuario en Supabase Auth
 * 4. Insertar datos adicionales en tabla 'users' (first_name, last_name, phone)
 * 
 * @param formData - Datos del formulario de registro
 * @returns AuthResponse con status y mensaje
 */
export async function registerUser(
  formData: FormData
): Promise<AuthResponse> {
  try {
    // Extraer datos del FormData
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      first_name: formData.get("first_name") as string | undefined,
      last_name: formData.get("last_name") as string | undefined,
      phone: formData.get("phone") as string | undefined,
    };

    // Validar datos con Zod
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

    // TODO: Implementar registro con Supabase
    // 
    // import { createClient } from '@/utils/supabase/server';
    // 
    // const supabase = createClient();
    // 
    // // 1. Crear usuario en Supabase Auth
    // const { data: authData, error: authError } = await supabase.auth.signUp({
    //   email: validatedData.email,
    //   password: validatedData.password,
    //   options: {
    //     data: {
    //       first_name: validatedData.first_name,
    //       last_name: validatedData.last_name,
    //       phone: validatedData.phone,
    //     }
    //   }
    // });
    // 
    // if (authError) {
    //   return {
    //     status: "error",
    //     message: authError.message,
    //   };
    // }
    // 
    // // 2. Insertar datos adicionales en tabla 'users' si es necesario
    // if (authData.user) {
    //   const { error: dbError } = await supabase
    //     .from('users')
    //     .insert({
    //       id: authData.user.id,
    //       email: validatedData.email,
    //       first_name: validatedData.first_name || null,
    //       last_name: validatedData.last_name || null,
    //       phone: validatedData.phone || null,
    //       verified_email: false,
    //     });
    //   
    //   if (dbError) {
    //     console.error('Error insertando en tabla users:', dbError);
    //   }
    // }

    // Simulación temporal hasta implementar Supabase
    console.log("Datos de registro validados:", {
      email: validatedData.email,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      phone: validatedData.phone,
    });

    // Respuesta temporal de éxito
    return {
      status: "success",
      message: "¡Registro exitoso! Por favor verifica tu email.",
    };

  } catch (error) {
    console.error("Error en registerUser:", error);
    return {
      status: "error",
      message: "Error inesperado durante el registro. Por favor intenta de nuevo.",
    };
  }
}
