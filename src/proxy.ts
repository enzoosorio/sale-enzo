import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleRouteProtection } from './auth-middleware'
// import { updateSession } from "@/utils/supabase/middleware"
 
// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
  // return await updateSession(request)

  // Handle route protection (authentication check)
  const protectionResponse = handleRouteProtection(request);
  if (protectionResponse) {
    return protectionResponse; // Return redirect if user is not authenticated
  }

  // Redirecting all requests to homepage ('/home') if the user tries to access '/'
  const url = request.nextUrl.clone()
  if (url.pathname === '/') {
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Continue with the request if no special handling is needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (images, audio, video, fonts)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|mp4|webm|woff|woff2|ttf|otf)$).*)",
  ],
}