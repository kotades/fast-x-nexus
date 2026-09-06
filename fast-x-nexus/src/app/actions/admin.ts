'use server';

/**
 * /src/app/actions/admin.ts
 * Fast X Nexus — Enterprise Admin Server Actions
 *
 * Provides backend administrative capabilities:
 * 1. getAllOrdersAdmin: Paginated, filtered, and searched logistics waybill pipeline.
 * 2. assignRiderToOrder: Atomic manual rider assignment with audit logging and notifications.
 * 3. cancelOrderAdmin: Safe order cancellation with audit reasoning and cache eviction.
 * 4. getAllRidersAdmin: Comprehensive fleet roster with verification, vehicle metadata & active workloads.
 * 5. updateRiderApproval: KYC compliance state & active fleet status management.
 * 6. getAdminFinancialStats: 70/30 escrow ledger analytics (GMV, platform revenue, daily/weekly splits).
 * 7. getSystemHealthStats: Core platform telemetry (DB latency, H3 spatial clusters, queue dwell time).
 */

import { createAdminClient } from '@/lib/supabase/server';
import { invalidateJobPool } from '@/lib/cache/redis';
import { sendWhatsAppMessage, buildRiderDispatchMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Safe fallback when executed in non-request contexts or tests
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface GetAllOrdersAdminParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface AdminOrderResult {
  id: string;
  customer_id: string;
  rider_id: string | null;
  status: string;
  pickup_h3_cell: string;
  dropoff_h3_cell: string;
  pickup_name?: string | null;
  pickup_phone?: string | null;
  pickup_address?: string | null;
  dropoff_name?: string | null;
  dropoff_phone?: string | null;
  dropoff_address?: string | null;
  preferred_delivery_time?: string | null;
  total_amount: number;
  created_at: string;
  metadata?: Record<string, any> | null;
  parcels?: any[];
  customer?: any;
  rider?: any;
}

export interface AdminRiderProfile {
  id: string;
  role: string;
  whatsapp_contact: string | null;
  whatsapp_verified: boolean;
  active_status: boolean;
  is_verified: boolean;
  verification_status: 'VERIFIED' | 'PENDING';
  vehicle_info: {
    type: string;
    plate: string;
    coverage_zone: string;
    driver_license_number: string;
  };
  active_orders_count: number;
  current_location: {
    latitude: number;
    longitude: number;
    h3_cell: string;
    updated_at: string;
  } | null;
  metadata: Record<string, any>;
}

// ─── 1. Get All Orders Admin ──────────────────────────────────────────────────

/**
 * Queries orders joined with parcels, customer profile, and rider profile.
 * Supports filtering by status, search by waybill ID, sender name, recipient name, or address.
 */
export async function getAllOrdersAdmin(params: GetAllOrdersAdminParams = {}) {
  try {
    const adminClient = await createAdminClient();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('orders')
      .select(`
        *,
        parcels (*),
        customer:profiles!customer_id (*),
        rider:profiles!rider_id (*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by order status if specified and not ALL
    if (params.status && params.status.toUpperCase() !== 'ALL') {
      query = query.eq('status', params.status.toUpperCase());
    }

    // Search query on waybill ID, pickup/dropoff names, or addresses
    if (params.search && params.search.trim().length > 0) {
      const rawSearch = params.search.trim();
      const sanitized = rawSearch.replace(/[,()]/g, '').trim();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitized);
      const hexMatch = sanitized.replace(/^FX-/i, '');
      const isHexUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hexMatch);

      if (isUuid) {
        query = query.or(`id.eq.${sanitized},pickup_name.ilike.%${sanitized}%,dropoff_name.ilike.%${sanitized}%,pickup_address.ilike.%${sanitized}%,dropoff_address.ilike.%${sanitized}%`);
      } else if (isHexUuid) {
        query = query.or(`id.eq.${hexMatch},pickup_name.ilike.%${sanitized}%,dropoff_name.ilike.%${sanitized}%,pickup_address.ilike.%${sanitized}%,dropoff_address.ilike.%${sanitized}%`);
      } else {
        query = query.or(`pickup_name.ilike.%${sanitized}%,dropoff_name.ilike.%${sanitized}%,pickup_address.ilike.%${sanitized}%,dropoff_address.ilike.%${sanitized}%`);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;
    if (error) throw error;

    return {
      success: true,
      orders: (orders as AdminOrderResult[]) || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      data: {
        orders: (orders as AdminOrderResult[]) || [],
        totalCount: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error: any) {
    console.error('[Action: getAllOrdersAdmin] Error:', error);
    return {
      success: false,
      orders: [],
      totalCount: 0,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: 0,
      error: error.message || 'Failed to fetch admin orders',
    };
  }
}

// ─── 2. Assign Rider to Order ─────────────────────────────────────────────────

/**
 * Atomically updates orders setting rider_id and status = 'ASSIGNED'.
 * Sends WhatsApp notification to the assigned rider and logs an audit event in metadata.
 * Evicts job pool cache.
 */
export async function assignRiderToOrder(orderId: string, riderId: string) {
  try {
    const adminClient = await createAdminClient();

    // 1. Fetch current order to preserve metadata & gather payload for notification
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('*, parcels(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Fetch rider details
    const { data: rider, error: riderError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', riderId)
      .single();

    if (riderError || !rider) {
      return { success: false, error: 'Rider profile not found' };
    }

    // 3. Compose audit event
    const prevMetadata = (order.metadata && typeof order.metadata === 'object') ? order.metadata : {};
    const auditTrail = Array.isArray(prevMetadata.audit_trail) ? [...prevMetadata.audit_trail] : [];
    const auditEvent = {
      event: 'RIDER_ASSIGNED',
      rider_id: riderId,
      assigned_at: new Date().toISOString(),
      performed_by: 'admin',
      previous_status: order.status,
    };
    auditTrail.push(auditEvent);

    const updatedMetadata = {
      ...prevMetadata,
      assigned_rider_id: riderId,
      assigned_at: new Date().toISOString(),
      audit_trail: auditTrail,
    };

    // 4. Atomically update orders record
    const { data: updatedOrder, error: updateError } = await adminClient
      .from('orders')
      .update({
        rider_id: riderId,
        status: 'ASSIGNED',
        metadata: updatedMetadata,
      })
      .eq('id', orderId)
      .select('*, parcels(*)')
      .single();

    if (updateError) throw updateError;

    // 5. Send WhatsApp notification to rider (fire and forget)
    if (rider.whatsapp_contact) {
      try {
        const msg = buildRiderDispatchMessage({
          orderId: `FX-${order.id.substring(0, 8).toUpperCase()}`,
          pickupHub: order.pickup_address || order.pickup_name || 'Pickup Hub',
          dropoffHub: order.dropoff_address || order.dropoff_name || 'Dropoff Hub',
          parcelSize: 'Standard Cargo',
          payoutNaira: Math.round((Number(order.total_amount) || 0) * 0.7),
        });

        sendWhatsAppMessage({
          to: rider.whatsapp_contact,
          message: msg,
        }).catch((e) => console.warn('[assignRiderToOrder] Notification delivery notice:', e));
      } catch (notifyErr) {
        console.warn('[assignRiderToOrder] Notification build exception:', notifyErr);
      }
    }

    // 6. Invalidate job pool cache
    await invalidateJobPool();

    safeRevalidatePath('/admin');
    safeRevalidatePath('/rider');
    safeRevalidatePath('/customer');

    return {
      success: true,
      order: updatedOrder,
      data: updatedOrder,
      auditEvent,
    };
  } catch (error: any) {
    console.error('[Action: assignRiderToOrder] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign rider to order',
    };
  }
}

/**
 * Atomically unassigns the rider from an order and returns it to PAID_UNASSIGNED status.
 * Logs an audit event and evicts job pool cache.
 */
export async function unassignRiderAdmin(orderId: string, reason?: string) {
  try {
    const adminClient = await createAdminClient();

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('*, parcels(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const prevMetadata = (order.metadata && typeof order.metadata === 'object') ? order.metadata : {};
    const auditTrail = Array.isArray(prevMetadata.audit_trail) ? [...prevMetadata.audit_trail] : [];
    const auditEvent = {
      event: 'RIDER_UNASSIGNED',
      previous_rider_id: order.rider_id,
      unassigned_at: new Date().toISOString(),
      performed_by: 'admin',
      reason: reason || 'Manual admin unassignment',
      previous_status: order.status,
    };
    auditTrail.push(auditEvent);

    const updatedMetadata = {
      ...prevMetadata,
      assigned_rider_id: null,
      unassigned_at: new Date().toISOString(),
      audit_trail: auditTrail,
    };

    const { data: updatedOrder, error: updateError } = await adminClient
      .from('orders')
      .update({
        rider_id: null,
        status: 'PAID_UNASSIGNED',
        metadata: updatedMetadata,
      })
      .eq('id', orderId)
      .select('*, parcels(*)')
      .single();

    if (updateError) throw updateError;

    await invalidateJobPool();

    safeRevalidatePath('/admin');
    safeRevalidatePath('/rider');
    safeRevalidatePath('/customer');

    return {
      success: true,
      order: updatedOrder,
      data: updatedOrder,
      auditEvent,
    };
  } catch (error: any) {
    console.error('[Action: unassignRiderAdmin] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to unassign rider from order',
    };
  }
}

// ─── 3. Cancel Order Admin ────────────────────────────────────────────────────

/**
 * Updates order status to CANCELLED.
 * Records cancellation reason and audit details in metadata.
 * Evicts job pool cache.
 */
export async function cancelOrderAdmin(orderId: string, reason: string) {
  try {
    const adminClient = await createAdminClient();

    // 1. Fetch current order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('*, parcels(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Prepare metadata with cancellation reason & audit trail
    const prevMetadata = (order.metadata && typeof order.metadata === 'object') ? order.metadata : {};
    const auditTrail = Array.isArray(prevMetadata.audit_trail) ? [...prevMetadata.audit_trail] : [];
    const auditEvent = {
      event: 'ORDER_CANCELLED',
      reason,
      cancelled_at: new Date().toISOString(),
      performed_by: 'admin',
      previous_status: order.status,
    };
    auditTrail.push(auditEvent);

    const updatedMetadata = {
      ...prevMetadata,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      audit_trail: auditTrail,
    };

    // 3. Update orders status
    const { data: updatedOrder, error: updateError } = await adminClient
      .from('orders')
      .update({
        status: 'CANCELLED',
        metadata: updatedMetadata,
      })
      .eq('id', orderId)
      .select('*, parcels(*)')
      .single();

    if (updateError) throw updateError;

    // 4. Also append cancellation tag to parcel description for redundancy
    if (order.parcels && order.parcels.length > 0) {
      for (const parcel of order.parcels) {
        const updatedDesc = `${parcel.description || ''} [CANCELLED: ${reason}]`.trim();
        try {
          await adminClient
            .from('parcels')
            .update({ description: updatedDesc })
            .eq('id', parcel.id);
        } catch (e: any) {
          console.warn('[cancelOrderAdmin] Parcel update notice:', e);
        }
      }
    }

    // 5. Invalidate cache
    await invalidateJobPool();

    safeRevalidatePath('/admin');
    safeRevalidatePath('/rider');
    safeRevalidatePath('/customer');

    return {
      success: true,
      order: updatedOrder,
      data: updatedOrder,
      reason,
    };
  } catch (error: any) {
    console.error('[Action: cancelOrderAdmin] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel order',
    };
  }
}

// ─── 4. Get All Riders Admin ──────────────────────────────────────────────────

/**
 * Fetches all rider profiles from profiles where role = 'rider'.
 * Enriches with verification status, vehicle info (from metadata), active orders count,
 * and live telemetry coordinates.
 */
export async function getAllRidersAdmin() {
  try {
    const adminClient = await createAdminClient();

    // 1. Fetch all rider profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('role', 'rider')
      .order('id');

    if (profilesError) throw profilesError;

    // 2. Fetch latest telemetry locations for riders
    const { data: locations } = await adminClient
      .from('rider_locations')
      .select('*');

    const locationMap = new Map<string, any>();
    if (locations) {
      locations.forEach((loc) => {
        locationMap.set(loc.rider_id, loc);
      });
    }

    // 3. Fetch active orders count per rider (ASSIGNED, PICKED_UP)
    const { data: activeOrders } = await adminClient
      .from('orders')
      .select('id, rider_id, status')
      .in('status', ['ASSIGNED', 'PICKED_UP']);

    const activeOrderCountMap = new Map<string, number>();
    if (activeOrders) {
      activeOrders.forEach((o) => {
        if (o.rider_id) {
          activeOrderCountMap.set(o.rider_id, (activeOrderCountMap.get(o.rider_id) || 0) + 1);
        }
      });
    }

    // 4. Enrich riders
    const riders: AdminRiderProfile[] = (profiles || []).map((p) => {
      const meta = (p.metadata && typeof p.metadata === 'object') ? p.metadata : {};
      const loc = locationMap.get(p.id);
      const activeCount = activeOrderCountMap.get(p.id) || 0;

      const isVerified = Boolean(
        meta.kyc_approved ?? meta.verified ?? (p.whatsapp_verified && p.active_status)
      );

      return {
        id: p.id,
        role: p.role,
        whatsapp_contact: p.whatsapp_contact,
        whatsapp_verified: p.whatsapp_verified,
        active_status: p.active_status,
        is_verified: isVerified,
        verification_status: isVerified ? 'VERIFIED' : 'PENDING',
        vehicle_info: {
          type: meta.vehicle_type || 'N/A',
          plate: meta.vehicle_plate || 'N/A',
          coverage_zone: meta.coverage_zone || 'N/A',
          driver_license_number: meta.driver_license_number || 'N/A',
        },
        active_orders_count: activeCount,
        current_location: loc ? {
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          h3_cell: loc.h3_cell,
          updated_at: loc.updated_at,
        } : null,
        metadata: {
          ...meta,
          kyc_approved: isVerified,
          vehicle_type: meta.vehicle_type || 'N/A',
          vehicle_plate: meta.vehicle_plate || 'N/A',
          coverage_zone: meta.coverage_zone || 'N/A',
          driver_license_number: meta.driver_license_number || 'N/A',
        },
      };
    });

    return {
      success: true,
      riders,
      data: riders,
    };
  } catch (error: any) {
    console.error('[Action: getAllRidersAdmin] Error:', error);
    return {
      success: false,
      riders: [],
      data: [],
      error: error.message || 'Failed to fetch riders',
    };
  }
}

// ─── 5. Update Rider Approval ─────────────────────────────────────────────────

/**
 * Updates rider profile active_status and metadata verification / KYC fields.
 */
export async function updateRiderApproval(riderId: string, isApproved: boolean, notes?: string) {
  try {
    const adminClient = await createAdminClient();

    // 1. Fetch existing profile
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', riderId)
      .single();

    if (fetchError || !profile) {
      return { success: false, error: 'Rider profile not found' };
    }

    // 2. Prepare metadata
    const prevMetadata = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
    const updatedMetadata = {
      ...prevMetadata,
      kyc_approved: isApproved,
      verified: isApproved,
      approval_notes: notes || prevMetadata.approval_notes || null,
      last_reviewed_at: new Date().toISOString(),
    };

    // 3. Update profile
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        active_status: isApproved,
        metadata: updatedMetadata,
      })
      .eq('id', riderId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    safeRevalidatePath('/admin');
    safeRevalidatePath('/rider');

    return {
      success: true,
      profile: updatedProfile,
      data: updatedProfile,
    };
  } catch (error: any) {
    console.error('[Action: updateRiderApproval] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update rider approval',
    };
  }
}

// ─── 6. Get Admin Financial Stats ─────────────────────────────────────────────

/**
 * Calculates Total GMV, 70% Rider Escrow pool, 30% Fast X platform gross revenue.
 * Summarizes daily and weekly revenue splits and active escrow holdings.
 */
export async function getAdminFinancialStats() {
  try {
    const adminClient = await createAdminClient();

    const { data: orders, error } = await adminClient
      .from('orders')
      .select('id, status, total_amount, created_at');

    if (error) throw error;

    const allOrders = orders || [];
    const validOrders = allOrders.filter((o) => o.status !== 'CANCELLED');

    const totalGMV = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const riderEscrowPool = Math.round(totalGMV * 0.7 * 100) / 100;
    const platformGrossRevenue = Math.round(totalGMV * 0.3 * 100) / 100;

    // Time boundaries
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const dailyOrders = validOrders.filter((o) => new Date(o.created_at).getTime() >= oneDayAgo);
    const weeklyOrders = validOrders.filter((o) => new Date(o.created_at).getTime() >= sevenDaysAgo);

    const dailyGMV = dailyOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const dailyRiderEscrow = Math.round(dailyGMV * 0.7 * 100) / 100;
    const dailyPlatformRevenue = Math.round(dailyGMV * 0.3 * 100) / 100;

    const weeklyGMV = weeklyOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const weeklyRiderEscrow = Math.round(weeklyGMV * 0.7 * 100) / 100;
    const weeklyPlatformRevenue = Math.round(weeklyGMV * 0.3 * 100) / 100;

    const completedOrders = validOrders.filter((o) => o.status === 'DELIVERED');
    const completedGMV = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const disbursedPayouts = Math.round(completedGMV * 0.7 * 100) / 100;
    const activeEscrowHolding = Math.round((riderEscrowPool - disbursedPayouts) * 100) / 100;

    return {
      success: true,
      totalGMV,
      riderEscrowPool,
      platformGrossRevenue,
      dailyRevenue: dailyGMV,
      weeklyRevenue: weeklyGMV,
      summary: {
        totalGMV,
        riderEscrowPool,
        platformGrossRevenue,
        activeEscrowHolding,
        disbursedPayouts,
        daily: {
          gmv: dailyGMV,
          riderEscrow: dailyRiderEscrow,
          platformRevenue: dailyPlatformRevenue,
          orderCount: dailyOrders.length,
        },
        weekly: {
          gmv: weeklyGMV,
          riderEscrow: weeklyRiderEscrow,
          platformRevenue: weeklyPlatformRevenue,
          orderCount: weeklyOrders.length,
        },
        orderCounts: {
          total: allOrders.length,
          valid: validOrders.length,
          delivered: completedOrders.length,
          cancelled: allOrders.filter((o) => o.status === 'CANCELLED').length,
          active: validOrders.filter((o) => ['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP'].includes(o.status)).length,
        },
      },
      data: {
        totalGMV,
        riderEscrowPool,
        platformGrossRevenue,
        dailyRevenue: dailyGMV,
        weeklyRevenue: weeklyGMV,
        activeEscrowHolding,
      },
    };
  } catch (error: any) {
    console.error('[Action: getAdminFinancialStats] Error:', error);
    return {
      success: false,
      totalGMV: 0,
      riderEscrowPool: 0,
      platformGrossRevenue: 0,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      error: error.message || 'Failed to calculate financial stats',
    };
  }
}

// ─── 7. Get System Health Stats ───────────────────────────────────────────────

/**
 * Checks database ping latency, active H3 clusters across rider telemetry & open orders,
 * and unassigned order queue latency.
 */
export async function getSystemHealthStats() {
  try {
    const adminClient = await createAdminClient();

    // 1. Check DB ping latency
    const pingStart = performance.now();
    const { error: pingError } = await adminClient.from('profiles').select('id').limit(1);
    const dbPingMs = Math.round(performance.now() - pingStart);

    // 2. Active H3 clusters: from rider locations and open orders
    const [locationsResult, ordersResult] = await Promise.all([
      adminClient.from('rider_locations').select('h3_cell, updated_at'),
      adminClient.from('orders').select('pickup_h3_cell, dropoff_h3_cell, status, created_at'),
    ]);

    const activeH3Clusters = new Set<string>();
    if (locationsResult.data) {
      locationsResult.data.forEach((loc) => {
        if (loc.h3_cell) activeH3Clusters.add(loc.h3_cell);
      });
    }
    if (ordersResult.data) {
      ordersResult.data.forEach((ord) => {
        if (ord.status !== 'CANCELLED' && ord.status !== 'DELIVERED') {
          if (ord.pickup_h3_cell) activeH3Clusters.add(ord.pickup_h3_cell);
          if (ord.dropoff_h3_cell) activeH3Clusters.add(ord.dropoff_h3_cell);
        }
      });
    }

    // 3. Unassigned orders queue latency
    const unassignedOrders = (ordersResult.data || []).filter((o) =>
      o.status === 'PAID_UNASSIGNED' || o.status === 'PLACED'
    );

    const now = Date.now();
    const latenciesMinutes = unassignedOrders.map((o) => {
      const createdMs = new Date(o.created_at).getTime();
      return Math.max(0, Math.round((now - createdMs) / 60000));
    });

    const averageLatencyMinutes = latenciesMinutes.length > 0
      ? Math.round((latenciesMinutes.reduce((a, b) => a + b, 0) / latenciesMinutes.length) * 10) / 10
      : 0;

    const maxLatencyMinutes = latenciesMinutes.length > 0
      ? Math.max(...latenciesMinutes)
      : 0;

    return {
      success: true,
      dbPing: {
        latencyMs: dbPingMs,
        status: pingError ? 'DOWN' : dbPingMs < 200 ? 'HEALTHY' : dbPingMs < 500 ? 'DEGRADED' : 'CRITICAL',
      },
      h3Clusters: {
        activeCount: activeH3Clusters.size,
        clusters: Array.from(activeH3Clusters),
      },
      unassignedQueue: {
        unassignedCount: unassignedOrders.length,
        averageLatencyMinutes,
        maxLatencyMinutes,
        status: averageLatencyMinutes < 10 ? 'NOMINAL' : averageLatencyMinutes < 30 ? 'ELEVATED' : 'CONGESTED',
      },
      timestamp: new Date().toISOString(),
      data: {
        dbPingMs,
        activeH3ClustersCount: activeH3Clusters.size,
        unassignedOrdersCount: unassignedOrders.length,
        averageLatencyMinutes,
        maxLatencyMinutes,
      },
    };
  } catch (error: any) {
    console.error('[Action: getSystemHealthStats] Error:', error);
    return {
      success: false,
      dbPing: { latencyMs: -1, status: 'DOWN' },
      h3Clusters: { activeCount: 0, clusters: [] },
      unassignedQueue: { unassignedCount: 0, averageLatencyMinutes: 0, maxLatencyMinutes: 0, status: 'UNKNOWN' },
      error: error.message || 'Failed to fetch system health stats',
    };
  }
}
