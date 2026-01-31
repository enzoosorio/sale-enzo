'use client'

import Script from 'next/script'
import { createClient } from '@/utils/supabase/client'
import type { accounts, CredentialResponse } from 'google-one-tap'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

declare const google: { accounts: accounts }

// Generar nonce para el sign-in con Google ID token
const generateNonce = async (): Promise<string[]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const encoder = new TextEncoder()
  const encodedNonce = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return [nonce, hashedNonce]
}

export default function GoogleOneTap() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitialized, setIsInitialized] = useState(false)

  const initializeGoogleOneTap = async () => {
    if (isInitialized) return
    
    // Verificar que el client_id esté configurado
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
      return
    }
    
    // No mostrar One-Tap en páginas de autenticación o raíz
    const authPages = ['/login', '/register', '/auth', '/']
    const isAuthPage = authPages.some(page => pathname === page || pathname?.startsWith(page + '/'))
    
    if (isAuthPage) {
      return
    }

    const [nonce, hashedNonce] = await generateNonce()

    // Verificar si ya hay una sesión activa
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session', error)
    }
    if (data.session) {
      return
    }

    // Suprimir logs molestos de Google GSI
    const originalConsoleError = console.error
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn
    
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      if (
        message.includes('[GSI_LOGGER]') ||
        message.includes('FedCM') ||
        message.includes('NetworkError') ||
        message.includes('AbortError')
      ) {
        return
      }
      originalConsoleError.apply(console, args)
    }

    console.log = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      if (message.includes('[GSI_LOGGER]')) {
        return
      }
      originalConsoleLog.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      if (
        message.includes('[GSI_LOGGER]') ||
        message.includes('FedCM') ||
        message.includes('fedcm') ||
        message.includes('One Tap')
      ) {
        return
      }
      originalConsoleWarn.apply(console, args)
    }

    // Inicializar Google One-Tap
    try {
      /* global google */
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: CredentialResponse) => {
          try {
            // Restaurar console para ver errores reales de autenticación
            console.error = originalConsoleError
            console.log = originalConsoleLog
            console.warn = originalConsoleWarn
            
            // Enviar el ID token a Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce,
            })

            if (error) {
              console.error('Error al iniciar sesión con Google One-Tap:', error)
              throw error
            }
            
            // Redirigir a home después del login exitoso
            router.push('/home')
            router.refresh()
          } catch (error) {
            console.error('Error al autenticar con Google One-Tap:', error)
          }
        },
        nonce: hashedNonce,
        // Compatibilidad con la eliminación de cookies de terceros de Chrome
        use_fedcm_for_prompt: true,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      
      // Según la guía de migración de FedCM, no usar isNotDisplayed() ni isSkippedMoment()
      // Solo llamar a prompt() sin callback
      google.accounts.id.prompt()
      
      // Restaurar console después de un delay para evitar logs de Google
      setTimeout(() => {
        console.error = originalConsoleError
        console.log = originalConsoleLog
        console.warn = originalConsoleWarn
      }, 500)
      
      setIsInitialized(true)
    } catch (error) {
      // Restaurar console en caso de error
      console.error = originalConsoleError
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn
      
      // Solo loggear errores que no sean de FedCM/GSI
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (
        !errorMessage.includes('AbortError') && 
        !errorMessage.includes('FedCM') &&
        !errorMessage.includes('NetworkError')
      ) {
        console.error('Error initializing Google One-Tap:', error)
      }
    }
  }

  // Limpiar One-Tap cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        google.accounts.id.cancel()
      }
    }
  }, [])

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      onReady={() => {
        initializeGoogleOneTap()
      }}
      strategy="lazyOnload"
    />
  )
}
