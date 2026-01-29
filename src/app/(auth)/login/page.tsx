import { DynamicButton } from "@/components/auth/DynamicButton";
import { PrimaryButton } from "@/components/reusable/CTA/buttons/Button";
import { SecondaryButton } from "@/components/reusable/CTA/buttons/SecondaryButton";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="flex flex-col items-start justify-start p-4 pl-[200px] py-8">
      
      {/* Login Card */}
      <div className={`
        w-full min-w-[320px] xl:min-w-[600px] 
        max-w-md bg-[rgba(12,12,12,0.1)] backdrop-blur-[5px] 
        flex flex-col items-start justify-start 
        border border-white/20
        rounded-md shadow-lg p-8 gap-8`}>
        <div className="flex flex-col items-start justify-start gap-2">
          {/* Title */}
          <h1 className="font-prata text-2xl text-center  text-foreground">
            INICIAR SESIÓN
          </h1>

          {/* Subtitle */}
          <p className="font-inria text-left text-foreground/70 text-sm w-[55ch] ">
            Inicia sesión para poder comprar, además de aprovechar las funcionalidades IA de la página web.
          </p>
        </div>
        
        {/* container inputs, primary button, separator and oauth buttons */}
       <div className="flex flex-col items-start justify-start gap-4 w-full">
          {/* container inputs & primary button  */}
          <div className="flex flex-col items-start justify-start gap-6 w-full">
            {/* container just for inputs */}
            <div className="flex flex-col items-start justify-start gap-2 w-full">
            {/* Email Input */}
              <div className="mb-2 w-full">
                <label htmlFor="email" className="block font-inria text-sm mb-2 text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 h-10 text-sm font-inria bg-white border border-white/40 backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
              {/* Password Input */}
              <div className="mb-2 w-full">
                <label htmlFor="password" className="block font-inria text-sm mb-2 text-foreground">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="w-full px-4 h-10 text-sm font-inria bg-white border border-white/40 backdrop-blur-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
              <PrimaryButton className="w-full text-sm">
                Iniciar sesión
              </PrimaryButton>
          </div>
          {/* Divider with O */}
          <div className="flex items-center w-full ">
            <span className="font-prata text-foreground/60 w-full text-center text-xl ">-------- O --------</span>          
          </div>

          <div className="flex flex-col items-center justify-center w-full gap-4">
            <SecondaryButton className="text-sm w-full">
            Iniciar sesión con Apple
          </SecondaryButton>
          <SecondaryButton className="text-sm w-full">
            Iniciar sesión con Google
          </SecondaryButton>
           <SecondaryButton className="text-sm w-full">
            Iniciar sesión con Facebook
          </SecondaryButton>
          </div>

          {/* Register Link */}
          <p className="text-center font-inria text-sm text-foreground">
            ¿No tienes cuenta?{" "}
            <Link 
              href="/register" 
              className="text-foreground border-b border-b-black/70 font-semibold hover:underline"
            >
              Regístrate aquí
            </Link>
            
          </p>
        </div>
      </div>
    </section>
  );
}
