import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const url = request.nextUrl.clone()
  const pathname = request.nextUrl.pathname

  // Debug logs
  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Path:', pathname)
  console.log('User authenticated:', !!user)
  console.log('User email:', user?.email || 'none')

  // Redirigir raíz a home
  if (pathname === '/') {
    console.log('Action: Redirect / → /home')
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Si el usuario ya está autenticado y intenta acceder a login o register, redirigir a home
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    console.log('Action: Authenticated user trying to access auth page, redirecting to /home')
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Proteger rutas privadas - usuarios no autenticados van a /login
  // Excepciones: /login, /register, /auth (callback), /home (público)
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/home') &&
    !pathname.startsWith('/register') &&
    !pathname.startsWith('/auth')
  ) {
    console.log('Action: Unauthenticated user trying to access protected route, redirecting to /login')
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  console.log('Action: Allow access')
  console.log('========================')
  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse
}