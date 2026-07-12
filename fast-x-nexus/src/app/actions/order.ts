'use server';

/**
 * /src/app/actions/order.ts
 * Fast X Nexus — updateOrderStatus Server Action
 *
 * Enforces role-based permission checks at the application layer before
 * delegating to Supabase. The database-level FSM trigger acts as a final
 * safety net — if an invalid transition is attempted, the trigger raises
 * a PostgreSQL exception which we catch and translate into a user-friendly
 * error message.
 *
 * Permission matrix (application layer):
 *   ADMIN  → any transition
 *   RIDER  → unassigned→accepted, accepted→picked_up, picked_up→in_transit, in_transit→delivered, any→failed
 *   VENDOR → placed→unassigned
 */

import { z } from 'zod';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { verifyPaystackTransaction } from '@/lib/paystack';
import type { ActionResult } from './booking';

import { type OrderStatus, type UserRole } from '@/types/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────
const ORDER_STATUSES = [
  'PLACED',
  'PAID_UNASSIGNED',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
] as const;

// ─── Input Schema ─────────────────────────────────────────────────────────────
const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  new_status: z
    .string()
    .refine((v): v is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(v), {
      message: 'Invalid order status value',
    }),
  rider_id: z.string().uuid('Invalid rider ID').optional(),
});

// ─── Permission Matrix ────────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<UserRole, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  admin: {
    PLACED:          ['PAID_UNASSIGNED', 'CANCELLED'],
    PAID_UNASSIGNED: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED:        ['PICKED_UP', 'CANCELLED'],
    PICKED_UP:       ['DELIVERED'],
  },
  rider: {
    PAID_UNASSIGNED: ['ASSIGNED'],
    ASSIGNED:        ['PICKED_UP'],
    PICKED_UP:       ['DELIVERED'],
  },
  vendor: {
    PLACED: ['PAID_UNASSIGNED', 'CANCELLED'],
  },
  customer: {
    PLACED: ['CANCELLED'],
  },
};

function isTransitionAllowed(
  role: UserRole,
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const allowed = ALLOWED_TRANSITIONS[role]?.[currentStatus] ?? [];
  return allowed.includes(newStatus);
}

// ─── Server Action ────────────────────────────────────────────────────────────
export async function updateOrderStatus(input: {
  order_id: string;
  new_status: string;
  rider_id?: string;
}): Promise<ActionResult<{ order_id: string; status: string }>> {
  // 1. Validate input
  const parsed = UpdateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { order_id, new_status, rider_id } = parsed.data;

  // 2. Authenticate caller
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 3. Fetch user role and current order status in one round-trip
  const [profileResult, orderResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('orders').select('status, customer_id, rider_id').eq('id', order_id).single(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return { success: false, error: 'User profile not found.' };
  }

  if (orderResult.error || !orderResult.data) {
    return { success: false, error: 'Order not found or access denied.' };
  }

  const role = profileResult.data.role as UserRole;
  const currentStatus = orderResult.data.status as OrderStatus;

  // 4. Application-level permission check
  if (!isTransitionAllowed(role, currentStatus, new_status as OrderStatus)) {
    return {
      success: false,
      error: `Your role (${role}) is not permitted to transition an order from '${currentStatus}' to '${new_status}'.`,
    };
  }

  // 5. If transitioning to ASSIGNED, assign the rider_id first (RLS update policy checks this)
  if (new_status === 'ASSIGNED') {
    let targetRiderId = null;

    if (role === 'rider') {
      targetRiderId = user.id;
    } else if (role === 'admin' && rider_id) {
      targetRiderId = rider_id;
    }

    if (targetRiderId) {
      const { error: assignError } = await supabase
        .from('orders')
        .update({ rider_id: targetRiderId })
        .eq('id', order_id);

      if (assignError) {
        console.error('[updateOrderStatus] Rider assignment error:', assignError);
        return {
          success: false,
          error: 'Failed to assign rider to order. Check permissions.',
        };
      }
    } else if (role === 'admin' && !rider_id) {
      return {
        success: false,
        error: 'Rider ID must be specified for admin assignment.',
      };
    }
  }


  // 6. Execute update via the FSM RPC to enforce state transition matrices
  const { error: transitionError } = await supabase.rpc(
    'process_order_state_transition',
    {
      target_order_id: order_id,
      next_status: new_status,
    }
  );

  if (transitionError) {
    console.error('[updateOrderStatus] FSM RPC error:', transitionError);
    return {
      success: false,
      error: `Invalid status transition: ${transitionError.message}`,
    };
  }


  return { success: true, data: { order_id, status: new_status } };
}

// ─── Manual Payment Sync / Verification Status Action Loop (Admins Only) ──────
export async function verifyPaystackPayment(input: {
  order_id: string;
  reference: string;
}): Promise<ActionResult<{ order_id: string; status: string }>> {
  // 1. Authenticate caller and verify they are an admin
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found.' };
  }

  if (profile.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  // 2. Query Paystack verify API directly
  console.log(`📡 [PAYSTACK MANUAL SYNC] Contacting Paystack to verify reference: ${input.reference}`);
  const verifyResult = await verifyPaystackTransaction(input.reference);
  
  if (verifyResult.tag === 'failure' || verifyResult.status !== 'success') {
    return {
      success: false,
      error: `Paystack verification failed: ${verifyResult.error || 'Transaction not successful (' + verifyResult.status + ')'}`,
    };
  }

  const paidAmount = (verifyResult.amountKobo || 0) / 100;

  // 3. Fetch order from DB
  const adminClient = await createAdminClient();
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('total_amount, status, customer_id')
    .eq('id', input.order_id)
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Order not found in database.' };
  }

  // Idempotency check: if status is already PAID_UNASSIGNED or further, skip and return success
  const processedStatuses = ['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];
  if (processedStatuses.includes(order.status)) {
    console.log(`ℹ️ [PAYSTACK MANUAL SYNC] Order ${input.order_id} is already in status "${order.status}". Idempotency matched.`);
    return { success: true, data: { order_id: input.order_id, status: order.status } };
  }

  // Cross-examine payment amount
  if (Number(order.total_amount) !== paidAmount) {
    return {
      success: false,
      error: `Amount mismatch: Order requires ₦${order.total_amount} but payment reference indicates ₦${paidAmount} was paid.`,
    };
  }

  // 4. Invoke FSM: Transitions state PLACED -> PAID_UNASSIGNED
  const { data: transitionResult, error: transitionError } = await adminClient.rpc(
    'process_order_state_transition',
    {
      target_order_id: input.order_id,
      next_status: 'PAID_UNASSIGNED',
    }
  );

  if (transitionError) {
    console.error(`❌ [PAYSTACK MANUAL SYNC] FSM state transition failed for ${input.order_id}:`, transitionError);
    return { success: false, error: `FSM transition failed: ${transitionError.message}` };
  }

  console.log(`✅ [PAYSTACK MANUAL SYNC] Order ${input.order_id} manually verified and transitioned to PAID_UNASSIGNED`);

  // 5. Fetch customer profile for WhatsApp dispatch alert
  const { data: customerProfile } = await adminClient
    .from('profiles')
    .select('whatsapp_contact')
    .eq('id', order.customer_id)
    .single();

  const recipientList: string[] = [];
  if (customerProfile?.whatsapp_contact) {
    recipientList.push(customerProfile.whatsapp_contact);
  }

  // Fetch Admin profiles to notify the admin workspace/dashboard
  const { data: adminProfiles } = await adminClient
    .from('profiles')
    .select('whatsapp_contact')
    .eq('role', 'admin');

  if (adminProfiles) {
    adminProfiles.forEach(admin => {
      if (admin.whatsapp_contact && !recipientList.includes(admin.whatsapp_contact)) {
        recipientList.push(admin.whatsapp_contact);
      }
    });
  }

  const formattedAmount = `₦${paidAmount.toFixed(2)}`;
  const alertMessage = `📦 Fast X Dispatch Alert: Order ${input.order_id} has been paid successfully (${formattedAmount}). Logistics Waybill generated. Package is waiting in the Effurun Hub pool for rider pickup.`;

  const workerUrl = process.env.WHATSAPP_WORKER_URL || 'http://localhost:3001/send-message';
  console.log(`🚀 [PAYSTACK MANUAL SYNC] Attempting notification dispatch to worker URL: ${workerUrl}`);

  for (const rawPhone of recipientList) {
    const cleanPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
    console.log(`📤 Sending dispatch notification to: ${cleanPhone}`);
    try {
      await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanPhone,
          message: alertMessage,
        }),
      });
    } catch (dispatchError) {
      console.error(`💥 [PAYSTACK MANUAL SYNC] Failed to contact Baileys Worker for ${cleanPhone}:`, dispatchError);
    }
  }

  return { success: true, data: { order_id: input.order_id, status: 'PAID_UNASSIGNED' } };
}

