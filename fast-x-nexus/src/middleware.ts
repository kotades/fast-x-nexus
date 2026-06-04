/**
 * /src/middleware.ts
 * Fast X Nexus — Auth Gate + Role-Based Routing Middleware
 *
 * Responsibilities:
 *   1. Refresh Supabase Auth session on every request (keeps users signed in)
 *   2. Redirect unauthenticated users hitting protected routes → /login
 *   3. Redirect authenticated users hitting /login → their role-specific hub
 *   4. Redirect authenticated users hitting / → their role-specific hub
 *
 * Role → Landing Hub mapping:
 *   customer  → /booking
 *   rider     → /jobs
 *   vendor    → /admin   (vendor shares admin hub for now)
 *   admin     → /admin
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ─── Route Classification ─────────────────────────────────────────────────────
/** Routes that unauthenticated users CAN access */
const PUBLIC_ROUTES = ['/login', '/terms', '/privacy', '/'];

/** Routes that require an authenticated session */
const PROTECTED_PREFIXES = ['/booking', '/jobs', '/admin', '/dashboard', '/profile'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Maps a DB role string to the appropriate landing page */
function roleLandingPath(role: string | null): string {
  switch (role) {
    case 'rider':   return '/jobs';
    case 'admin':   return '/admin';
    case 'vendor':  return '/admin';
    case 'customer':
    default:        return '/booking';
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: Refresh the session — DO NOT remove or move this call.
  const { data: { user } } = await supabase.auth.getUser();

  // ── Case 1: Unauthenticated user hitting a protected route ────────────────
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Preserve intended destination so we can redirect back after login
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Case 2: Authenticated user hitting /login or root / ──────────────────
  if (user && (pathname === '/login' || pathname === '/')) {
    // Fetch role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const destination = roleLandingPath(profile?.role ?? null);
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = destination;
    return NextResponse.redirect(hubUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static assets)
     * - _next/image  (image optimization)
     * - favicon.ico + common static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
