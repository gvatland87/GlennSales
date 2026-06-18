import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware — kjører på edge ved hvert sidebesøk.
 *
 * Logikk:
 *  1. Ikke innlogget + ikke auth-side → /auth/logg-inn
 *  2. Innlogget + profil ikke ferdig (setup_done !== true) + ikke auth-side → /auth/profil-oppsett
 *  3. Innlogget + er på /auth/logg-inn → /meetings
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // VIKTIG: bruk getUser() (ikke getSession()) for å verifisere JWT mot Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();

  const pathname    = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/auth');

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/auth/logg-inn', request.url));
  }

  if (user && pathname === '/auth/logg-inn') {
    return NextResponse.redirect(new URL('/meetings', request.url));
  }

  if (user && !isAuthRoute) {
    const setupDone = user.user_metadata?.setup_done === true;
    if (!setupDone) {
      return NextResponse.redirect(new URL('/auth/profil-oppsett', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
