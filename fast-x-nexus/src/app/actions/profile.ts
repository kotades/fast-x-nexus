'use server';

/**
 * /src/app/actions/profile.ts
 * Fast X Nexus — Profile & Customer Orders Actions
 *
 * Handles fetching/updating user profile details and retrieving customer orders.
 * Scoped properly to the authenticated user using Supabase RLS.
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

// ─── Server Action: Get Profile ────────────────────────────────────────────────
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
  //    the current user's own row.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, whatsapp_contact, whatsapp_verified, active_status, metadata')
    .eq('id', user.id)
    .single();

  if (profileError) {
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

// ─── Server Action: Update Profile ─────────────────────────────────────────────
export async function updateUserProfile(data: {
  fullName?: string;
  whatsappContact?: string;
}): Promise<ActionResult<UserProfile>> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 1. Get existing profile to merge metadata
  const { data: existingProfile, error: getError } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', user.id)
    .single();

  if (getError) {
    console.error('[updateUserProfile] Fetch error:', getError);
    return { success: false, error: 'Failed to retrieve current profile.' };
  }

  const updatedMetadata = {
    ...(existingProfile?.metadata || {}),
    ...(data.fullName ? { full_name: data.fullName } : {}),
  };

  const updatePayload: any = {
    metadata: updatedMetadata,
  };

  if (data.whatsappContact !== undefined) {
    updatePayload.whatsapp_contact = data.whatsappContact;
  }

  // 2. Update profiles table
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, role, whatsapp_contact, whatsapp_verified, active_status, metadata')
    .single();

  if (updateError) {
    console.error('[updateUserProfile] DB error:', updateError);
    return { success: false, error: 'Failed to update profile.' };
  }

  return {
    success: true,
    data: updatedProfile as UserProfile,
  };
}

// ─── Server Action: Get Customer Orders ────────────────────────────────────────
export async function getCustomerOrders(): Promise<ActionResult<any[]>> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Fetch orders and join with parcels table
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      pickup_h3_cell,
      dropoff_h3_cell,
      total_amount,
      created_at,
      rider_id,
      parcels (
        weight,
        description,
        declared_value
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getCustomerOrders] DB error:', error);
    return { success: false, error: 'Failed to fetch historical orders.' };
  }

  // Flatten the parcel info for easier consumption by components
  const formattedOrders = (orders || []).map((order: any) => {
    const parcel = order.parcels && order.parcels[0];
    return {
      id: order.id,
      status: order.status,
      pickupH3Cell: order.pickup_h3_cell,
      dropoffH3Cell: order.dropoff_h3_cell,
      totalAmount: order.total_amount,
      createdAt: new Date(order.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      riderId: order.rider_id,
      weight: parcel?.weight ? `${parcel.weight}kg` : 'N/A',
      description: parcel?.description || 'Standard Cargo',
      declaredValue: parcel?.declared_value || 0,
    };
  });

  return { success: true, data: formattedOrders };
}

