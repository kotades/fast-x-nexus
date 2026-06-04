/**
 * /src/lib/supabase/client.ts
 * Fast X Nexus — Supabase Browser Client (Client Components)
 *
 * Use this client in Client Components ('use client') ONLY.
 * It uses the ANON key — safe for browser exposure.
 * Row-Level Security (RLS) enforces data access on the DB layer.
 *
 * Usage:
 *   import { createBrowserClient } from '@/lib/supabase/client'
 *   const supabase = createBrowserClient()
 */

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
