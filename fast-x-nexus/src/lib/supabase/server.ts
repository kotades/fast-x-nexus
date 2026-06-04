/**
 * /src/lib/supabase/server.ts
 * Fast X Nexus — Supabase Server Client (Server Components & API Routes)
 *
 * Use this client in:
 *   - Server Components
 *   - Route Handlers (app/api/...)
 *   - Server Actions
 *   - Middleware
 *
 * This client reads/writes cookies via Next.js cookies() to manage the
 * user session server-side. CRITICAL: Never use this in 'use client' files.
 *
 * Usage:
 *   import { createServerClient } from '@/lib/supabase/server'
 *   const supabase = await createServerClient()
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The setAll method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the Service Role key.
 * Bypasses RLS — use ONLY for trusted server-side admin operations.
 * NEVER expose this client or its key to the browser.
 */
export async function createAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
