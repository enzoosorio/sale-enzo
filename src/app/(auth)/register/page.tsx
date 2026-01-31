"use client";

import { PrimaryButton } from "@/components/reusable/CTA/buttons/Button";
import { SecondaryButton } from "@/components/reusable/CTA/buttons/SecondaryButton";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { registerUser } from "@/actions/register";
import { showToast } from "@/lib/auth/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { AuthWrapper } from "@/components/auth/AuthCardWrapper";
import { createClient } from "@/utils/supabase/client";

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
        
        // Si hay redirect sugerido, usarlo; sino ir a login por defecto
        const redirectTo = response.redirect || "/login";
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } else {
        showToast(response.message, "error");
        
        // Si hay redirect en error (ej: "ya registrado, ir a login")
        if (response.redirect) {
          setTimeout(() => {
            router.push(response.redirect!);
          }, 2000);
        }
      }
    } catch (error) {
      showToast("Error inesperado. Por favor intenta de nuevo.", "error");
      console.error("Error en handleSubmit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple" | 'facebook') => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const origin = window.location.origin;
        
        const { data, error } = await supabase.auth.signInWithOAuth({ 
          provider,
          options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
  
        if (error) {
          showToast(`Error al iniciar sesión con ${provider}: ${error.message}`, "error");
          setIsLoading(false);
        }
        // Si no hay error, el usuario será redirigido automáticamente
      } catch (error) {
        console.error('OAuth error:', error);
        showToast("Error inesperado al iniciar sesión", "error");
        setIsLoading(false);
      }
    };

  return (
      <AuthWrapper>
        <div className="flex flex-col items-start justify-start gap-2">
          {/* Title */}
          <h1 className="font-prata text-2xl text-center text-foreground">
            CREAR CUENTA
          </h1>

          {/* Subtitle */}
          <p className="font-inria text-left text-foreground/70 text-sm w-10/12">
            Regístrate para poder comprar y aprovechar las funcionalidades IA de la página web.
          </p>
        </div>
        
        {/* Container inputs, primary button, separator and oauth buttons */}
        <form onSubmit={handleSubmit} className="flex flex-col items-start justify-start gap-4 w-full">
          {/* Container inputs & primary button  */}
          <div className="flex flex-col items-start justify-start gap-6 w-full">
            {/* Container just for inputs */}
            <div className="flex flex-col items-start justify-start gap-2 w-full">
              
              {/* First Name Input */}
              <div className="mb-2 w-full">
                <label htmlFor="first_name" className="block font-inria text-sm mb-2 text-foreground">
                  Nombres
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
                  Apellidos
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
           {/* Apple oauth button */}
            <SecondaryButton
              type="button"
              className="text-sm w-full"
              disabled={isLoading}
              onClick={() => {
                handleOAuthLogin('apple')
              }}
            >
              <div className="flex items-center justify-center gap-2 w-full">
                {/* apple logo svg */}
                <div className="w-max h-max pb-0.5">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className=""
                  >
                    <g clipPath="url(#clip0_457_950)">
                      <path
                        d="M21.792 18.7035C21.429 19.542 20.9994 20.3139 20.5016 21.0235C19.8231 21.9908 19.2676 22.6605 18.8395 23.0323C18.1758 23.6426 17.4647 23.9552 16.7032 23.973C16.1566 23.973 15.4973 23.8175 14.73 23.5019C13.9601 23.1878 13.2525 23.0323 12.6056 23.0323C11.9271 23.0323 11.1994 23.1878 10.4211 23.5019C9.64153 23.8175 9.01355 23.9819 8.53342 23.9982C7.80322 24.0293 7.07539 23.7078 6.3489 23.0323C5.88521 22.6279 5.30523 21.9345 4.61043 20.9524C3.86498 19.9035 3.25211 18.6872 2.77198 17.3006C2.25777 15.8029 2 14.3526 2 12.9484C2 11.3401 2.34754 9.95284 3.04367 8.79035C3.59076 7.8566 4.31859 7.12003 5.22953 6.57931C6.14046 6.03858 7.12473 5.76304 8.18469 5.74541C8.76467 5.74541 9.52524 5.92481 10.4704 6.27739C11.4129 6.63116 12.0181 6.81056 12.2834 6.81056C12.4817 6.81056 13.154 6.60079 14.2937 6.18258C15.3714 5.79474 16.281 5.63415 17.0262 5.69741C19.0454 5.86037 20.5624 6.65634 21.5712 8.09037C19.7654 9.18456 18.8721 10.7171 18.8898 12.6831C18.9061 14.2145 19.4617 15.4888 20.5535 16.5006C21.0483 16.9703 21.6009 17.3332 22.2156 17.591C22.0823 17.9776 21.9416 18.348 21.792 18.7035V18.7035ZM17.161 0.480381C17.161 1.68066 16.7225 2.80135 15.8484 3.83865C14.7937 5.0718 13.5179 5.78437 12.1343 5.67193C12.1167 5.52793 12.1065 5.37638 12.1065 5.21713C12.1065 4.06487 12.6081 2.83172 13.4989 1.82345C13.9436 1.31295 14.5092 0.888472 15.1951 0.54986C15.8796 0.216299 16.5269 0.0318332 17.1358 0.000244141C17.1536 0.160702 17.161 0.32117 17.161 0.480365V0.480381Z"
                        fill="#3F3838"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_457_950">
                        <rect width="24" height="24" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <span>Registrarse con Apple</span>
              </div>
            </SecondaryButton>
            {/* Google oauth button */}
            <SecondaryButton
              type="button"
              className="text-sm w-full"
              disabled={isLoading}
              onClick={() =>{
                handleOAuthLogin('google')
              }}
            >
              <div className="flex items-center justify-center gap-2 w-full ">
                <div>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <g clipPath="url(#clip0_405_885)">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1.27293 14.4818C0.591094 13.1364 0.200195 11.6182 0.200195 10C0.200195 8.3818 0.591094 6.86363 1.27293 5.51816C2.91836 2.24547 6.29109 0 10.2002 0C12.9002 0 15.1547 0.990898 16.8911 2.6091L14.0274 5.47273C12.982 4.4909 11.6729 3.9818 10.2002 3.9818C7.6002 3.9818 5.39109 5.73637 4.6002 8.1C4.4002 8.7 4.28199 9.33633 4.28199 10C4.28199 10.6636 4.4002 11.3 4.6002 11.9L4.58836 11.9091H4.6002C5.39109 14.2727 7.6002 16.0273 10.2002 16.0273C11.5456 16.0273 12.682 15.6636 13.5729 15.0636C14.6366 14.3545 15.3456 13.3 15.582 12.0545H10.2002V8.1818H19.6184C19.7365 8.83637 19.8002 9.51816 19.8002 10.2273C19.8002 13.2727 18.7093 15.8363 16.8184 17.5818C15.1638 19.1091 12.9002 20 10.2002 20C6.29109 20 2.91836 17.7545 1.27293 14.4909V14.4818Z"
                        fill="#3F3838"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_405_885">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <span>Registrarse con Google</span>
              </div>
            </SecondaryButton>

            {/* Facebook oauth button */}
            <SecondaryButton
              type="button"
              className="text-sm w-full"
              disabled={isLoading}
              onClick={() => {
                handleOAuthLogin('facebook')
              }}
            >
              <div className="flex items-center justify-center gap-2 w-full ">
                <div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <g clipPath="url(#clip0_408_1057)">
                      <path
                        d="M10 0C4.4772 0 0 4.4772 0 10C0 14.6896 3.2288 18.6248 7.5844 19.7056V13.056H5.5224V10H7.5844V8.6832C7.5844 5.2796 9.1248 3.702 12.4664 3.702C13.1 3.702 14.1932 3.8264 14.6404 3.9504V6.7204C14.4044 6.6956 13.9944 6.6832 13.4852 6.6832C11.8456 6.6832 11.212 7.3044 11.212 8.9192V10H14.4784L13.9172 13.056H11.212V19.9268C16.1636 19.3288 20.0004 15.1128 20.0004 10C20 4.4772 15.5228 0 10 0Z"
                        fill="#3F3838"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_408_1057">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <span>Registrarse con Facebook</span>
              </div>
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
      </AuthWrapper>
  );
}
