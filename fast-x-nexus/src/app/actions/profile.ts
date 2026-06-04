'use server';

/**
 * /src/app/actions/profile.ts
 * Fast X Nexus — getUserProfile Server Action
 *
 * Fetches the complete profile for the currently authenticated user.
 * Uses the anon-key server client so RLS automatically scopes the query
 * to the requesting user — no manual ID filtering needed.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { ActionResult } from './booking';

// ─── Return Type ──────────────────────────────────────────────────────────────
export type UserProfile = {
  id: string;
  role: 'admin' | 'vendor' | 'rider' | 'customer';
  whatsapp_contact: string | null;
  whatsapp_verified: boolean;
  active_status: boolean;
  metadata: Record<string, unknown>;
};

// ─── Server Action ────────────────────────────────────────────────────────────
export async function getUserProfile(): Promise<ActionResult<UserProfile>> {
  // 1. Authenticate caller
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 2. Fetch profile — RLS on `profiles` ensures this can only ever return
  //    the current user's own row (or an admin's target row).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, whatsapp_contact, whatsapp_verified, active_status, metadata')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // PGRST116 means "no rows returned" — profile doesn't exist yet
    if (profileError.code === 'PGRST116') {
      return {
        success: false,
        error:
          'Profile not found. Your account may still be initializing — please try again in a moment.',
      };
    }

    console.error('[getUserProfile] DB error:', profileError);
    return { success: false, error: 'Failed to fetch profile. Please try again.' };
  }

  return {
    success: true,
    data: profile as UserProfile,
  };
}
