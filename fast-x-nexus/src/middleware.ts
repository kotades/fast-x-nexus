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
const PROTECTED_PREFIXES = ['/booking', '/jobs', '/admin', '/customer', '/rider', '/profile'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Maps a DB role string to the appropriate landing page */
function roleLandingPath(role: string | null): string {
  switch (role) {
    case 'rider':   return '/rider';
    case 'admin':   return '/admin';
    case 'vendor':  return '/admin';
    case 'customer': return '/customer';
    default:        return '/customer'; // Fallback to avoid infinite redirect loops in auth edge states
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
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (authError) {
    // Edge runtime fetch failure (e.g. network timeout) — let request through without auth
    console.error('[Middleware] Auth check failed:', authError);
    return supabaseResponse;
  }

  // ── Case 1: Unauthenticated user hitting a protected route ────────────────
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Preserve intended destination so we can redirect back after login
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role and whatsapp_contact from profiles table if user exists
  let userRole: string | null = null;
  let whatsappContact: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, whatsapp_contact')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? 'customer'; // Fallback role to customer to prevent routing deadlocks
    whatsappContact = profile?.whatsapp_contact ?? user.phone ?? null;
  }

  const needsOnboarding = user && !whatsappContact;
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  // ── Case 2a: Intercept Missing WhatsApp Contact (Onboarding Lock) ───────────
  if (needsOnboarding && !isOnboardingRoute && !isPublicRoute(pathname)) {
    // If they need onboarding and are trying to access a protected route (or root), force them to onboarding
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = '/onboarding';
    return NextResponse.redirect(onboardingUrl);
  }

  // ── Case 2b: Prevent fully onboarded users from accessing /onboarding ───────
  if (!needsOnboarding && isOnboardingRoute) {
    const destination = roleLandingPath(userRole);
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = destination;
    return NextResponse.redirect(hubUrl);
  }

  // ── Case 3: Authenticated user hitting /login or root / ──────────────────
  if (user && (pathname === '/login' || pathname === '/')) {
    // If they need onboarding, 2a would have caught them if they hit /, but for /login we still want to route them
    const destination = needsOnboarding ? '/onboarding' : roleLandingPath(userRole);
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = destination;
    return NextResponse.redirect(hubUrl);
  }

  // ── Case 4: Strict Role-Based Route Isolation ──────────────────────────────
  if (user && isProtectedRoute(pathname) && !needsOnboarding) {
    let allowed = false;

    if (pathname.startsWith('/admin') && (userRole === 'admin' || userRole === 'vendor')) {
      allowed = true;
    } else if (pathname.startsWith('/jobs') && userRole === 'rider') {
      allowed = true;
    } else if (pathname.startsWith('/rider') && userRole === 'rider') {
      allowed = true;
    } else if (pathname.startsWith('/customer') && userRole === 'customer') {
      allowed = true;
    } else if (pathname.startsWith('/booking') && userRole === 'customer') {
      allowed = true;
    } else if (pathname.startsWith('/profile')) {
      allowed = true; // Any authenticated user can access their profile
    }

    if (!allowed) {
      // Force redirect to their appropriate home hub
      const destination = roleLandingPath(userRole);
      const hubUrl = request.nextUrl.clone();
      hubUrl.pathname = destination;
      return NextResponse.redirect(hubUrl);
    }
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
