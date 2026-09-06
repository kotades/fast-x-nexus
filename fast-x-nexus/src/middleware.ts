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
const PUBLIC_ROUTES = ['/login', '/terms', '/privacy', '/', '/onboarding/rider', '/rider/onboarding', '/admin/login'];

/** Routes that require an authenticated session */
const PROTECTED_PREFIXES = ['/booking', '/jobs', '/admin', '/customer', '/rider', '/profile'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

function isProtectedRoute(pathname: string): boolean {
  if (pathname === '/admin/login' || pathname.startsWith('/login/')) return false;
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

function createRedirect(url: URL | string, supabaseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
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
    return createRedirect(loginUrl, supabaseResponse);
  }

  // Fetch role and whatsapp_contact: Fast-path from JWT user metadata first (0ms)
  let userRole: string = 'customer';
  let whatsappContact: string | null = null;
  if (user) {
    userRole = user.app_metadata?.role || user.user_metadata?.role || 'customer';
    whatsappContact = user.user_metadata?.whatsapp_contact || user.phone || null;

    // Fast-fallback: If role or contact not in metadata, query profiles once
    if (!user.user_metadata?.role) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, whatsapp_contact')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          userRole = profile.role || userRole;
          whatsappContact = profile.whatsapp_contact || whatsappContact;
        }
      } catch {
        // Fallback to customer safely
      }
    }
  }

  const needsOnboarding = user && !whatsappContact && userRole !== 'admin' && userRole !== 'operator';
  const isGenericOnboarding = pathname === '/onboarding';

  // ── Case 2a: Intercept Missing WhatsApp Contact (Onboarding Lock) ───────────
  if (needsOnboarding && !isGenericOnboarding && !isPublicRoute(pathname)) {
    // If they need onboarding and are trying to access a protected route (or root), force them to onboarding
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = '/onboarding';
    return createRedirect(onboardingUrl, supabaseResponse);
  }

  // ── Case 2b: Prevent fully onboarded users from accessing /onboarding ───────
  if (!needsOnboarding && isGenericOnboarding) {
    const destination = roleLandingPath(userRole);
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = destination;
    return createRedirect(hubUrl, supabaseResponse);
  }

  // ── Case 3: Authenticated user hitting /login or root / ──────────────────
  if (user && (pathname === '/login' || pathname === '/')) {
    const nextParam = request.nextUrl.searchParams.get('next');
    let destination = needsOnboarding ? '/onboarding' : roleLandingPath(userRole);
    if (!needsOnboarding && nextParam && nextParam.startsWith('/') && !nextParam.startsWith('/login')) {
      destination = nextParam;
    }
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = destination;
    hubUrl.search = '';
    return createRedirect(hubUrl, supabaseResponse);
  }

  // ── Case 4: Role-Based Route Permissions ─────────────────────────────────
  if (user && isProtectedRoute(pathname) && !needsOnboarding) {
    let allowed = false;

    // Super-access: Admins and operators can access all portals
    if (userRole === 'admin' || userRole === 'operator' || userRole === 'vendor') {
      allowed = true;
    } else if (pathname.startsWith('/rider') || pathname.startsWith('/jobs')) {
      // Riders and users testing rider operations
      allowed = true;
    } else if (pathname.startsWith('/customer') || pathname.startsWith('/booking')) {
      allowed = true;
    } else if (pathname.startsWith('/profile')) {
      allowed = true;
    } else if (pathname.startsWith('/admin')) {
      allowed = userRole === 'admin' || userRole === 'vendor';
    }

    if (!allowed) {
      // Force redirect to their appropriate home hub
      const destination = roleLandingPath(userRole);
      const hubUrl = request.nextUrl.clone();
      hubUrl.pathname = destination;
      return createRedirect(hubUrl, supabaseResponse);
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
