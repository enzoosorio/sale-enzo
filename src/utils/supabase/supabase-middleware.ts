import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPrivatePage, isAdminApi, isAuthPage } from '@/lib/auth/routes';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } },
  );
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  // Preserve refreshed/deleted auth cookies on redirects and API errors as well.
  const withCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach(cookie => target.cookies.set(cookie));
    return target;
  };
  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return withCookies(NextResponse.redirect(url));
  };

  if (pathname === '/') return redirect('/home');
  if (user && isAuthPage(pathname)) return redirect('/home');
  if (!user && isAdminApi(pathname)) {
    return withCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  if (!user && isPrivatePage(pathname)) return redirect('/login');
  // Admin layouts/actions/API handlers still verify is_admin(), never just a session.
  return response;
}
