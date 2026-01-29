import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock authentication check - replace with real auth later
export function isAuthenticated(request: NextRequest): boolean {
  // Check for auth cookie/token
  // For now, this is a placeholder that always returns false
  const authToken = request.cookies.get('auth-token');
  return !!authToken?.value;
}

// Public routes that don't require authentication
export const publicRoutes = ['/', '/login', '/register', '/test', '/home'];

// Route protection middleware logic
export function handleRouteProtection(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If route is public, allow access
  if (isPublicRoute) {
    return null; // null means continue without redirect
  }

  // Check authentication status
  const userIsAuthenticated = isAuthenticated(request);

  // If not authenticated and trying to access protected route, redirect to login
  if (!userIsAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow access
  return null; // null means continue without redirect
}
