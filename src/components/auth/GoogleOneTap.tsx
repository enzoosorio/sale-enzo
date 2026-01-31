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
      console.log('Skipping One-Tap on auth pages or root:', pathname)
      return
    }

    const [nonce, hashedNonce] = await generateNonce()
    console.log('Nonce generated for One-Tap')

    // Verificar si ya hay una sesión activa
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session', error)
    }
    if (data.session) {
      console.log('User already logged in, skipping One-Tap')
      return
    }

    // Inicializar Google One-Tap
    try {
      /* global google */
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: CredentialResponse) => {
          try {
            console.log('Google One-Tap callback triggered')
            
            // Enviar el ID token a Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce,
            })

            if (error) throw error
            
            console.log('Successfully logged in with Google One Tap')
            
            // Redirigir a home después del login exitoso
            router.push('/home')
            router.refresh()
          } catch (error) {
            console.error('Error logging in with Google One Tap', error)
          }
        },
        nonce: hashedNonce,
        // Compatibilidad con la eliminación de cookies de terceros de Chrome
        use_fedcm_for_prompt: true,
        auto_select: false, // No auto-seleccionar para dar control al usuario
        cancel_on_tap_outside: true,
      })
      
      google.accounts.id.prompt((notification) => {
        console.log('One-Tap prompt notification:', notification)
        if (notification.isNotDisplayed()) {
          console.log('One-Tap not displayed:', notification.getNotDisplayedReason())
        } else if (notification.isSkippedMoment()) {
          console.log('One-Tap skipped:', notification.getSkippedReason())
        }
      })
      
      setIsInitialized(true)
    } catch (error) {
      console.error('Error initializing Google One-Tap:', error)
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
