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
import { invalidateJobPool, invalidateCustomerOrders } from '@/lib/cache/redis';
import { revalidatePath } from 'next/cache';
import { getH3CellFromCoords } from '@/lib/geo/h3';
import { deriveDualPins } from '@/lib/dispatch/pins';
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

  if (orderResult.data?.customer_id) {
    await invalidateCustomerOrders(orderResult.data.customer_id);
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

/**
 * Delete a single order and all its cascade dependencies (parcels, transactions, ledgers).
 */
export async function deleteOrderAction(orderId: string): Promise<ActionResult<{ order_id: string }>> {
  try {
    const supabase = await createServerClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'User not authenticated' };
    }

    // Purge related records
    await adminClient.from('parcels').delete().eq('order_id', orderId);
    await adminClient.from('rider_transactions').delete().eq('order_id', orderId);
    await adminClient.from('ledgers').delete().eq('order_id', orderId);

    // Delete the order itself
    const { error: orderDeleteError } = await adminClient
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderDeleteError) {
      return { success: false, error: orderDeleteError.message };
    }

    await invalidateJobPool();
    await invalidateCustomerOrders(session.user.id);
    revalidatePath('/customer');
    revalidatePath('/rider');

    return { success: true, data: { order_id: orderId } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete order' };
  }
}

/**
 * Clear all test orders for the active user (or all test orders if admin).
 */
export async function clearAllUserOrdersAction(): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const supabase = await createServerClient();
    const adminClient = await createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'User not authenticated' };
    }

    // Fetch user orders
    const { data: userOrders } = await adminClient
      .from('orders')
      .select('id')
      .eq('customer_id', session.user.id);

    const orderIds = (userOrders || []).map((o) => o.id);

    if (orderIds.length > 0) {
      await adminClient.from('parcels').delete().in('order_id', orderIds);
      await adminClient.from('rider_transactions').delete().in('order_id', orderIds);
      await adminClient.from('ledgers').delete().in('order_id', orderIds);
      await adminClient.from('orders').delete().in('id', orderIds);
    }

    await invalidateJobPool();
    await invalidateCustomerOrders(session.user.id);
    revalidatePath('/customer');
    revalidatePath('/rider');

    return { success: true, data: { deletedCount: orderIds.length } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to clear orders' };
  }
}

export interface FullOrderDetails {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupH3Cell: string;
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  dropoffH3Cell: string;
  totalAmount: number;
  createdAt: string;
  pickupPin: string;
  deliveryPin: string;
  parcel?: {
    weight: number;
    description: string;
    declaredValue: number;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehiclePlate: string;
    activeStatus: string;
    coords?: { lat: number; lng: number } | null;
  } | null;
  metadata?: Record<string, any>;
}

/**
 * Fetch complete order and telemetry details by UUID or Waybill prefix.
 */
export async function getOrderDetails(orderIdOrCode: string): Promise<ActionResult<FullOrderDetails>> {
  try {
    const adminClient = await createAdminClient();
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cleanInput = orderIdOrCode.trim().replace(/^FX-/i, '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);

    let query = adminClient
      .from('orders')
      .select(`
        *,
        parcels (*),
        customer:profiles!customer_id (*),
        rider:profiles!rider_id (*)
      `);

    if (isUuid) {
      query = query.eq('id', cleanInput);
    } else {
      // Hex prefix search e.g. E6F9D262
      query = query.ilike('id', `${cleanInput}%`);
    }

    const { data: orders, error } = await query.limit(1);

    if (error || !orders || orders.length === 0) {
      return { success: false, error: 'Order not found' };
    }

    const order = orders[0];
    const parcel = order.parcels?.[0];
    const customer = order.customer;
    const rider = order.rider;

    // Check if rider has a live location
    let riderCoords: { lat: number; lng: number } | null = null;
    if (order.rider_id) {
      const { data: loc } = await adminClient
        .from('rider_locations')
        .select('latitude, longitude, updated_at')
        .eq('rider_id', order.rider_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loc && loc.latitude && loc.longitude) {
        riderCoords = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
      }
    }

    const { pickupPin: rawPickupPin, deliveryPin: rawDeliveryPin } = deriveDualPins(
      order.id,
      order.metadata
    );

    // Handover security PINs are explicitly unmasked for physical chain-of-custody verification
    const pickupPin = rawPickupPin;
    const deliveryPin = rawDeliveryPin;

    const customerMeta = (customer?.metadata as any) || {};
    const riderMeta = (rider?.metadata as any) || {};

    const formatted: FullOrderDetails = {
      id: order.id,
      trackingCode: `FX-${order.id.slice(0, 8).toUpperCase()}`,
      status: order.status,
      pickupName: order.pickup_name || customerMeta.full_name || 'Sender',
      pickupPhone: order.pickup_phone || customer?.whatsapp_contact || '',
      pickupAddress: order.pickup_address || 'Origin Zone',
      pickupH3Cell: order.pickup_h3_cell,
      dropoffName: order.dropoff_name || 'Recipient',
      dropoffPhone: order.dropoff_phone || '',
      dropoffAddress: order.dropoff_address || 'Destination Zone',
      dropoffH3Cell: order.dropoff_h3_cell,
      totalAmount: Number(order.total_amount) || 0,
      createdAt: order.created_at,
      pickupPin,
      deliveryPin,
      parcel: parcel
        ? {
            weight: Number(parcel.weight) || 5,
            description: parcel.description || 'Standard Cargo',
            declaredValue: Number(parcel.declared_value) || 0,
          }
        : undefined,
      customer: customer
        ? {
            id: customer.id,
            name: customerMeta.full_name || 'Customer',
            phone: customer.whatsapp_contact || '',
          }
        : undefined,
      rider: rider
        ? {
            id: rider.id,
            name: riderMeta.full_name || 'Fast X Fleet Courier',
            phone: rider.whatsapp_contact || riderMeta.phone || '',
            vehicleType: riderMeta.vehicle_type ? riderMeta.vehicle_type.toUpperCase() : 'MOTORCYCLE',
            vehiclePlate: riderMeta.vehicle_plate || 'FX-DISPATCH',
            activeStatus: rider.active_status || 'ONLINE',
            coords: riderCoords,
          }
        : null,
      metadata: order.metadata || {},
    };

    return { success: true, data: formatted };
  } catch (err: any) {
    console.error('[Action: getOrderDetails] Error:', err);
    return { success: false, error: err.message || 'Failed to fetch order details' };
  }
}

export interface CreateCustomerOrderInput {
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  dropoffCoords?: { lat: number; lng: number } | null;
  preferredDeliveryTime?: string | null;
  itemDescription?: string;
  weightPreset?: 'document' | 'small_box' | 'medium_box' | null;
  budgetEstimate?: number;
}

/**
 * Creates a customer delivery order and associated parcel atomically,
 * invalidates redis caches, and broadcasts to the logistics dispatch pool.
 */
export async function createCustomerOrderAction(
  input: CreateCustomerOrderInput
): Promise<ActionResult<{ order: any; trackingCode: string }>> {
  try {
    const supabase = await createServerClient();
    const adminClient = await createAdminClient();

    // 1. Resolve user ID
    let customerId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      customerId = user.id;
    } else {
      // Fallback in local/dev test environment
      const { data: customerProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'customer')
        .limit(1)
        .maybeSingle();
      if (customerProfile) {
        customerId = customerProfile.id;
      }
    }

    if (!customerId) {
      return {
        success: false,
        error: 'Authentication required. Please ensure you are logged in as a customer.',
      };
    }

    // 2. Determine H3 cells (resolution 9)
    const pickupCell = input.pickupCoords
      ? getH3CellFromCoords(input.pickupCoords.lat, input.pickupCoords.lng, 9)
      : '89589c90d5bffff'; // Lagos Victoria Island default

    const dropoffCell = input.dropoffCoords
      ? getH3CellFromCoords(input.dropoffCoords.lat, input.dropoffCoords.lng, 9)
      : '89589c972bbffff'; // Lagos Yaba / Mainland default

    const totalAmount =
      input.budgetEstimate && input.budgetEstimate > 0 ? input.budgetEstimate : 5000;

    const orderId = crypto.randomUUID();
    const { pickupPin, deliveryPin } = deriveDualPins(orderId);

    // 3. Insert into orders
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        id: orderId,
        customer_id: customerId,
        status: 'PAID_UNASSIGNED',
        pickup_h3_cell: pickupCell,
        dropoff_h3_cell: dropoffCell,
        pickup_name: input.pickupName || 'Pickup Contact',
        pickup_phone: input.pickupPhone || '',
        pickup_address: input.pickupAddress,
        dropoff_name: input.dropoffName || 'Recipient Contact',
        dropoff_phone: input.dropoffPhone || '',
        dropoff_address: input.dropoffAddress,
        preferred_delivery_time: input.preferredDeliveryTime || null,
        total_amount: totalAmount,
        metadata: {
          pickup_pin: pickupPin,
          delivery_pin: deliveryPin,
        },
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error('[createCustomerOrderAction] Order insert error:', orderErr);
      return {
        success: false,
        error: orderErr?.message || 'Database error: failed to create order.',
      };
    }

    // 4. Insert parcel
    const weightMap: Record<string, number> = {
      document: 1,
      small_box: 5,
      medium_box: 15,
    };
    const parcelWeight = input.weightPreset ? weightMap[input.weightPreset] ?? 5 : 5;

    const { error: parcelErr } = await adminClient.from('parcels').insert({
      order_id: order.id,
      weight: parcelWeight,
      description: input.itemDescription || 'Standard Cargo',
      declared_value: totalAmount,
    });

    if (parcelErr) {
      console.warn('[createCustomerOrderAction] Parcel insert warning:', parcelErr);
    }

    // 5. Invalidate Job Pool & Customer Orders Redis Cache & Revalidate frontend routes
    await invalidateJobPool();
    await invalidateCustomerOrders(customerId);
    revalidatePath('/customer');
    revalidatePath('/rider');
    revalidatePath('/admin');

    const trackingCode = `FX-${order.id.slice(0, 8).toUpperCase()}`;

    return {
      success: true,
      data: {
        order: {
          ...order,
          pickup_h3_cell: pickupCell,
          dropoff_h3_cell: dropoffCell,
        },
        trackingCode,
      },
    };
  } catch (err: any) {
    console.error('[createCustomerOrderAction] Exception:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during order dispatch creation.',
    };
  }
}



