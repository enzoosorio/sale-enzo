"use client";

import { PrimaryButton } from "@/components/reusable/CTA/buttons/Button";
import { SecondaryButton } from "@/components/reusable/CTA/buttons/SecondaryButton";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { registerUser } from "@/actions/register";
import { showToast } from "@/lib/auth/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    // Preparar datos para validación
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      first_name: (formData.get("first_name") as string) || undefined,
      last_name: (formData.get("last_name") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
    };

    // Validar en cliente primero
    const validationResult = registerSchema.safeParse(rawData);

    if (!validationResult.success) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
      validationResult.error.issues.forEach((err) => {
        const field = err.path[0] as keyof RegisterInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      showToast("Por favor corrige los errores en el formulario", "error");
      return;
    }

    // Llamar a Server Action
    try {
      const response = await registerUser(formData);

      if (response.status === "success") {
        showToast(response.message, "success");
        // Redirigir al login o home después de registro exitoso
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        showToast(response.message, "error");
      }
    } catch (error) {
      showToast("Error inesperado. Por favor intenta de nuevo.", "error");
      console.error("Error en handleSubmit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={`h-auto 
    flex flex-col items-start justify-start p-4 pl-[200px] py-8`}>
      {/* Espaciador visual para efecto de "respiración" */}
      
      {/* Register Card */}
      <div className={`
        w-full min-w-[320px] xl:min-w-[600px] 
        max-w-md bg-[rgba(12,12,12,0.1)] backdrop-blur-[5px] 
        flex flex-col items-start justify-start 
        border border-white/20
        rounded-md shadow-lg p-8 gap-8`}>
        <div className="flex flex-col items-start justify-start gap-2">
          {/* Title */}
          <h1 className="font-prata text-2xl text-center text-foreground">
            CREAR CUENTA
          </h1>

          {/* Subtitle */}
          <p className="font-inria text-left text-foreground/70 text-sm w-[55ch]">
            Regístrate para poder comprar y aprovechar las funcionalidades IA de la página web.
          </p>
        </div>
        
        {/* Container inputs, primary button, separator and oauth buttons */}
        <form onSubmit={handleSubmit} className="flex flex-col items-start justify-start gap-4 w-full">
          {/* Container inputs & primary button  */}
          <div className="flex flex-col items-start justify-start gap-6 w-full">
            {/* Container just for inputs */}
            <div className="flex flex-col items-start justify-start gap-2 w-full">
              {/* Email Input */}
              <div className="mb-2 w-full">
                <label htmlFor="email" className="block font-inria text-sm mb-2 text-foreground">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="tu@email.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="mb-2 w-full">
                <label htmlFor="password" className="block font-inria text-sm mb-2 text-foreground">
                  Contraseña *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="mb-2 w-full">
                <label htmlFor="confirmPassword" className="block font-inria text-sm mb-2 text-foreground">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.confirmPassword}</p>
                )}
              </div>

              {/* First Name Input */}
              <div className="mb-2 w-full">
                <label htmlFor="first_name" className="block font-inria text-sm mb-2 text-foreground">
                  Nombre
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.first_name
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="Juan"
                  disabled={isLoading}
                />
                {errors.first_name && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.first_name}</p>
                )}
              </div>

              {/* Last Name Input */}
              <div className="mb-2 w-full">
                <label htmlFor="last_name" className="block font-inria text-sm mb-2 text-foreground">
                  Apellido
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.last_name
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="Pérez"
                  disabled={isLoading}
                />
                {errors.last_name && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.last_name}</p>
                )}
              </div>

              {/* Phone Input */}
              <div className="mb-2 w-full">
                <label htmlFor="phone" className="block font-inria text-sm mb-2 text-foreground">
                  Teléfono (Perú)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className={`w-full px-4 h-10 text-sm font-inria bg-white border backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-white/40 focus:ring-foreground/20"
                  }`}
                  placeholder="987654321"
                  maxLength={9}
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 font-inria">{errors.phone}</p>
                )}
              </div>
            </div>

            <PrimaryButton 
              type="submit" 
              className="w-full text-sm"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Crear cuenta"}
            </PrimaryButton>
          </div>

          {/* Divider with O */}
          <div className="flex items-center w-full">
            <span className="font-prata text-foreground/60 w-full text-center text-xl">-------- O --------</span>          
          </div>

          <div className="flex flex-col items-center justify-center w-full gap-4">
            <SecondaryButton 
              type="button" 
              className="text-sm w-full"
              disabled={isLoading}
            >
              Registrarse con Apple
            </SecondaryButton>
            <SecondaryButton 
              type="button" 
              className="text-sm w-full"
              disabled={isLoading}
            >
              Registrarse con Google
            </SecondaryButton>
            <SecondaryButton 
              type="button" 
              className="text-sm w-full"
              disabled={isLoading}
            >
              Registrarse con Facebook
            </SecondaryButton>
          </div>

          {/* Login Link */}
          <p className="text-center font-inria text-sm text-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link 
              href="/login" 
              className="text-foreground border-b border-b-black/70 font-semibold hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
