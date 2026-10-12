"use client";

import { PrimaryButton } from "@/components/reusable/CTA/buttons/Button";
import { SecondaryButton } from "@/components/reusable/CTA/buttons/SecondaryButton";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { registerUser } from "@/actions/register";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthWrapper } from "@/components/auth/AuthCardWrapper";
import { createClient } from "@/utils/supabase/client";
import { useMascotFeedback } from "@/store/mascotStore";
import { FormError } from "@/components/auth/FormError";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fireMascot = useMascotFeedback(isLoading);

  // Coming back from the OAuth provider can restore this page from the back/forward cache with
  // isLoading still true, which would leave every button disabled.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setIsLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setFormError(null);

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
      fireMascot("fail");
      setIsLoading(false);
      return;
    }

    // Llamar a Server Action
    try {
      const response = await registerUser(formData);

      if (response.status === "success") {
        fireMascot("success");
        
        // Si hay redirect sugerido, usarlo; sino ir a login por defecto
        const redirectTo = response.redirect || "/login";
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } else {
        setFormError(response.message);
        fireMascot("fail");
        
        // Si hay redirect en error (ej: "ya registrado, ir a login")
        if (response.redirect) {
          setTimeout(() => {
            router.push(response.redirect!);
          }, 2000);
        }
      }
    } catch (error) {
      setFormError("Error inesperado. Por favor intenta de nuevo.");
      fireMascot("fail");
      console.error("Error en handleSubmit:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | 'facebook') => {
      setIsLoading(true);
      setFormError(null);
      try {
        const supabase = createClient();
        const origin = window.location.origin;
        
        const { data, error } = await supabase.auth.signInWithOAuth({ 
          provider,
          options: {
            redirectTo: `${origin}/auth/callback`,
            // Google-only params: Facebook rejects/ignores them.
            queryParams:
              provider === 'google'
                ? { access_type: 'offline', prompt: 'consent' }
                : undefined,
          },
        });
  
        if (error) {
          setFormError(`Error al iniciar sesión con ${provider}: ${error.message}`);
          fireMascot("fail");
          setIsLoading(false);
        }
        // Si no hay error, el usuario será redirigido automáticamente
      } catch (error) {
        console.error('OAuth error:', error);
        setFormError("Error inesperado al iniciar sesión");
        fireMascot("fail");
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
            Regístrate para guardar tus favoritos y comprar.
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

            <FormError message={formError} />
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
