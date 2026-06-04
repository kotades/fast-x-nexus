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
import { createServerClient } from '@/lib/supabase/server';
import type { ActionResult } from './booking';

// ─── Types ────────────────────────────────────────────────────────────────────
const ORDER_STATUSES = [
  'placed',
  'unassigned',
  'accepted',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type UserRole = 'admin' | 'vendor' | 'rider' | 'customer';

// ─── Input Schema ─────────────────────────────────────────────────────────────
const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  new_status: z
    .string()
    .refine((v): v is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(v), {
      message: 'Invalid order status value',
    }),
});

// ─── Permission Matrix ────────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<UserRole, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  admin: {
    placed:    ['unassigned', 'failed'],
    unassigned:['accepted', 'failed'],
    accepted:  ['picked_up', 'failed'],
    picked_up: ['in_transit', 'failed'],
    in_transit:['delivered', 'failed'],
  },
  rider: {
    unassigned:['accepted'],
    accepted:  ['picked_up', 'failed'],
    picked_up: ['in_transit'],
    in_transit:['delivered', 'failed'],
  },
  vendor: {
    placed: ['unassigned'],
  },
  customer: {},
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
}): Promise<ActionResult<{ order_id: string; status: string }>> {
  // 1. Validate input
  const parsed = UpdateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  const { order_id, new_status } = parsed.data;

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
    supabase.from('orders').select('status, sender_id, rider_id').eq('id', order_id).single(),
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

  // 5. Execute update — RLS and the DB-level FSM trigger act as the final guardrail
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: new_status })
    .eq('id', order_id);

  if (updateError) {
    // Parse FSM trigger violations from the PostgREST error message
    const isFsmViolation =
      updateError.message.includes('Nexus Policy Violation') ||
      updateError.code === 'P0001';

    if (isFsmViolation) {
      return {
        success: false,
        error: `Invalid status transition: The order cannot be moved from '${currentStatus}' to '${new_status}'. Please check the order state and try again.`,
      };
    }

    console.error('[updateOrderStatus] DB error:', updateError);
    return {
      success: false,
      error: 'Failed to update order status. Please try again.',
    };
  }

  return { success: true, data: { order_id, status: new_status } };
}
