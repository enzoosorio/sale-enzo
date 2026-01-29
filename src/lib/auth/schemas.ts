import { z } from "zod";

/**
 * Schema de validación para Login
 * 
 * Valida email y contraseña básicos
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Debe ser un email válido"),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/**
 * Schema de validación para Register
 * 
 * Campos requeridos: email, password, confirmPassword
 * Campos opcionales: first_name, last_name, phone
 * 
 * phone se valida como teléfono peruano (9 dígitos)
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "El email es requerido")
      .email("Debe ser un email válido"),
    password: z
      .string()
      .min(1, "La contraseña es requerida")
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
      ),
    confirmPassword: z
      .string()
      .min(1, "Debes confirmar tu contraseña"),
    first_name: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.trim().length > 0,
        "El nombre no puede estar vacío si se proporciona"
      ),
    last_name: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.trim().length > 0,
        "El apellido no puede estar vacío si se proporciona"
      ),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^9\d{8}$/.test(val),
        "El teléfono debe ser un número peruano válido (9 dígitos empezando con 9)"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

/**
 * Tipos inferidos desde los schemas
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Tipo para la respuesta de las Server Actions de autenticación
 */
export type AuthResponse = {
  status: "success" | "error";
  message: string;
};
