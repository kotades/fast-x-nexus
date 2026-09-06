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
import { invalidateJobPool } from '@/lib/cache/redis';
import { revalidatePath } from 'next/cache';

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
  const adminClient = await createAdminClient();
  const { data: orderId, error: rpcError } = await adminClient.rpc(
    'create_order_with_ledger',
    {
      p_customer_id: user.id,
      p_pickup_h3_cell: pickup_h3,
      p_dropoff_h3_cell: metadata?.destination_label || pickup_h3,
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

  // Invalidate Redis Job Pool cache
  await invalidateJobPool();
  revalidatePath('/customer');
  revalidatePath('/rider');

  return { success: true, data: { order_id: orderId as string } };
}

/**
 * Simulates a gateway payment success (for development/testing).
 * Directly transitions order from PLACED to PAID_UNASSIGNED using the service client.
 */
export async function simulatePaymentSuccess(orderId: string): Promise<ActionResult<{ order_id: string; status: string }>> {
  const adminClient = await createAdminClient();
  
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('total_amount, customer_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Order not found.' };
  }

  const { data, error: transitionError } = await adminClient.rpc(
    'process_order_state_transition',
    {
      target_order_id: orderId,
      next_status: 'PAID_UNASSIGNED',
    }
  );

  if (transitionError) {
    console.error('[simulatePaymentSuccess] Transition failed:', transitionError);
    return { success: false, error: `Transition failed: ${transitionError.message}` };
  }

  // Invalidate Redis Cache instantly so riders see the new pool order
  await invalidateJobPool();
  revalidatePath('/customer');
  revalidatePath('/rider');

  // Fetch customer profile to notify them via WhatsApp
  const { data: customerProfile } = await adminClient
    .from('profiles')
    .select('whatsapp_contact')
    .eq('id', order.customer_id)
    .single();

  if (customerProfile?.whatsapp_contact) {
    const cleanPhone = customerProfile.whatsapp_contact.startsWith('+') 
      ? customerProfile.whatsapp_contact 
      : `+${customerProfile.whatsapp_contact}`;
      
    const alertMessage = `📦 Fast X Dispatch Alert: Order ${orderId} has been paid successfully (₦${Number(order.total_amount).toFixed(2)}). Logistics Waybill generated. Package is waiting in the pool for rider pickup.`;
    const workerUrl = process.env.WHATSAPP_WORKER_URL || 'http://localhost:3001/send-message';

    try {
      await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanPhone, message: alertMessage }),
      });
    } catch (dispatchError) {
      console.error('[simulatePaymentSuccess] Failed to contact WhatsApp worker:', dispatchError);
    }
  }

  return { success: true, data: { order_id: orderId, status: 'PAID_UNASSIGNED' } };
}

