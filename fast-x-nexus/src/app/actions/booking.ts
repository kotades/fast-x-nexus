'use server';

/**
 * /src/app/actions/booking.ts
 * Fast X Nexus — createBooking Server Action
 *
 * Delegates booking creation to the Postgres `create_order_with_ledger` RPC,
 * which atomically inserts the order and the initial ledger deposit in a
 * single transaction. If the ledger insert fails, the order rolls back.
 *
 * Security model:
 *   - User identity is established via Supabase Auth (server-side cookie session)
 *   - Application-level role check enforces only 'customer' can create bookings
 *   - DB write uses the Service Role admin client to call the SECURITY DEFINER RPC
 *   - RLS still protects SELECT access on all subsequent reads
 */

import { z } from 'zod';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

// ─── Input Schema ────────────────────────────────────────────────────────────
const CreateBookingSchema = z.object({
  /** H3 hex index string representing pickup location */
  pickup_h3: z.string().min(1, 'Pickup location is required'),
  /** Initial deposit / booking fee in the platform currency */
  amount: z.number().positive('Amount must be a positive number'),
  /** Arbitrary metadata: item category, weight class, notes, etc. */
  metadata: z
    .object({
      item_category: z.string().optional(),
      weight_class: z.string().optional(),
      notes: z.string().max(500).optional(),
      destination_label: z.string().optional(),
    })
    .passthrough()
    .optional()
    .default({}),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// ─── Action Response Type ─────────────────────────────────────────────────────
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Server Action ────────────────────────────────────────────────────────────
export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<{ order_id: string }>> {
  // 1. Validate input
  const parsed = CreateBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { pickup_h3, amount, metadata } = parsed.data;

  // 2. Authenticate the caller — use anon-keyed server client (reads session cookie)
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 3. Application-level role check
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found. Please complete your registration.' };
  }

  if (profile.role !== 'customer' && profile.role !== 'vendor') {
    return {
      success: false,
      error: 'Only customers or vendors can place bookings.',
    };
  }

  // 4. Call the atomic Postgres RPC via the Service Role (admin) client
  //    The RPC runs as SECURITY DEFINER, bypassing RLS for the insert
  //    while guaranteeing atomicity via the implicit transaction.
  const adminClient = await createAdminClient();
  const { data: orderId, error: rpcError } = await adminClient.rpc(
    'create_order_with_ledger',
    {
      p_sender_id: user.id,
      p_pickup_h3: pickup_h3,
      p_metadata: metadata,
      p_amount: amount,
    }
  );

  if (rpcError) {
    console.error('[createBooking] RPC error:', rpcError);
    return {
      success: false,
      error: 'Failed to create booking. Please try again.',
    };
  }

  return { success: true, data: { order_id: orderId as string } };
}
