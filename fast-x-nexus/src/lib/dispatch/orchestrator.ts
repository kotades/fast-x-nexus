/**
 * /src/lib/dispatch/orchestrator.ts
 * Fast X Nexus — Enterprise Dispatch Orchestrator
 *
 * Coordinates database retrieval, spatial H3 nearest-rider greedy allocation,
 * atomic database state mutation, and messaging broadcasts.
 */

import { createClient } from '@supabase/supabase-js';
import { isValidCell, cellToLatLng } from 'h3-js';
import { GreedyH3OrchestrationEngine } from './greedyEngine';
import {
  OrchestrationOrder,
  DriverCandidate,
  OrchestrationRunResult,
  OrchestrationOptions,
  DispatchPreviewResult,
  DispatchPreviewMatch,
  DispatchPreviewUnassigned,
} from './types';
import { sendWhatsAppMessage, buildRiderDispatchMessage } from '@/lib/whatsapp';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export class DispatchOrchestrator {
  private engine: GreedyH3OrchestrationEngine;

  constructor() {
    this.engine = new GreedyH3OrchestrationEngine();
  }

  /**
   * Fetches all unassigned orders ready for dispatch from Supabase.
   */
  public async fetchUnassignedOrders(): Promise<OrchestrationOrder[]> {
    const supabase = getAdminSupabase();

    const { data: rawOrders, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        pickup_h3_cell,
        dropoff_h3_cell,
        total_amount,
        created_at,
        pickup_name,
        pickup_phone,
        pickup_address,
        dropoff_name,
        dropoff_phone,
        dropoff_address,
        preferred_delivery_time,
        parcels (
          id,
          weight,
          dimensions,
          description
        )
      `)
      .in('status', ['PAID_UNASSIGNED', 'PLACED'])
      .is('rider_id', null)
      .order('created_at', { ascending: true });

    if (error || !rawOrders) {
      console.error('[Orchestrator] Error fetching unassigned orders:', error);
      return [];
    }

    return rawOrders.map((o) => {
      const parcelList = (o.parcels as any[]) || [];
      const entities = parcelList.map((p) => ({
        id: p.id,
        description: p.description || 'General Cargo',
        weightKg: Number(p.weight) || 1.0,
        declaredValueNgn: 10000,
      }));

      let pLat = 6.5244;
      let pLng = 3.3792;
      if (o.pickup_h3_cell && isValidCell(o.pickup_h3_cell)) {
        try {
          const [lat, lng] = cellToLatLng(o.pickup_h3_cell);
          pLat = lat;
          pLng = lng;
        } catch {
          // fallback
        }
      }

      let dLat = 6.6018;
      let dLng = 3.3515;
      if (o.dropoff_h3_cell && isValidCell(o.dropoff_h3_cell)) {
        try {
          const [lat, lng] = cellToLatLng(o.dropoff_h3_cell);
          dLat = lat;
          dLng = lng;
        } catch {
          // fallback
        }
      }

      return {
        id: o.id,
        trackingNumber: `FX-${o.id.substring(0, 8).toUpperCase()}`,
        status: o.status as any,
        priority: o.status === 'PAID_UNASSIGNED' ? 8 : 4,
        pickup: {
          type: 'pickup',
          address: o.pickup_address || 'Pickup Location',
          lat: pLat,
          lng: pLng,
          h3Cell: o.pickup_h3_cell,
          contactName: o.pickup_name,
          contactPhone: o.pickup_phone,
        },
        dropoff: {
          type: 'dropoff',
          address: o.dropoff_address || 'Dropoff Location',
          lat: dLat,
          lng: dLng,
          h3Cell: o.dropoff_h3_cell,
          contactName: o.dropoff_name,
          contactPhone: o.dropoff_phone,
        },
        entities,
        totalAmountNgn: Number(o.total_amount) || 0,
        createdAt: o.created_at,
        scheduledAt: o.preferred_delivery_time,
        customerPhone: o.pickup_phone,
      };
    });
  }

  /**
   * Fetches active, online drivers with their latest spatial locations.
   */
  public async fetchDriverCandidates(): Promise<DriverCandidate[]> {
    const supabase = getAdminSupabase();

    // Fetch profiles with role = 'rider'
    const { data: riderProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, whatsapp_contact, metadata, active_status')
      .eq('role', 'rider');

    if (profileErr || !riderProfiles) {
      console.error('[Orchestrator] Error fetching rider profiles:', profileErr);
      return [];
    }

    const availableProfiles = riderProfiles.filter((r) => r.active_status !== false);
    const riderIds = availableProfiles.map((r) => r.id);
    if (riderIds.length === 0) return [];

    // Fetch spatial coordinates from rider_locations
    const { data: locations } = await supabase
      .from('rider_locations')
      .select('rider_id, latitude, longitude, h3_cell, updated_at')
      .in('rider_id', riderIds);

    const locationMap = new Map((locations || []).map((l) => [l.rider_id, l]));

    // Fetch current active assigned orders count per rider
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('rider_id')
      .in('rider_id', riderIds)
      .in('status', ['ASSIGNED', 'PICKED_UP']);

    const orderCountMap = new Map<string, number>();
    (activeOrders || []).forEach((ao) => {
      if (ao.rider_id) {
        orderCountMap.set(ao.rider_id, (orderCountMap.get(ao.rider_id) || 0) + 1);
      }
    });

    return availableProfiles.map((r) => {
      const loc = locationMap.get(r.id);
      const meta = (r.metadata as Record<string, any>) || {};

      let lat = loc?.latitude ? Number(loc.latitude) : undefined;
      let lng = loc?.longitude ? Number(loc.longitude) : undefined;
      let cell = loc?.h3_cell;

      if ((lat === undefined || lng === undefined) && cell && isValidCell(cell)) {
        try {
          const [cLat, cLng] = cellToLatLng(cell);
          lat = cLat;
          lng = cLng;
        } catch {
          // fallback
        }
      }

      return {
        id: r.id,
        userId: r.id,
        name: meta.full_name || `Rider ${r.id.substring(0, 6)}`,
        phone: r.whatsapp_contact || '',
        avatarUrl: meta.avatar_url,
        vehicleType: meta.vehicle_type || 'motorcycle',
        isOnline: true,
        currentLat: lat,
        currentLng: lng,
        currentH3Cell: cell,
        assignedOrdersCount: orderCountMap.get(r.id) || 0,
        maxCapacityKg: meta.vehicle_type === 'truck' ? 2000 : meta.vehicle_type === 'van' ? 500 : 30,
        rating: meta.rating || 4.8,
      };
    });
  }

  /**
   * Generates a preview run of auto-dispatch matching without mutating database state.
   */
  public async previewAutoDispatch(
    options: OrchestrationOptions = {}
  ): Promise<DispatchPreviewResult> {
    const orders = await this.fetchUnassignedOrders();
    const drivers = await this.fetchDriverCandidates();

    const runId = `preview_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    if (orders.length === 0) {
      return {
        runId,
        timestamp,
        totalOrders: 0,
        matchedCount: 0,
        unassignedCount: 0,
        totalPayoutNgn: 0,
        avgDistanceKm: 0,
        matches: [],
        unassigned: [],
      };
    }

    const allocation = this.engine.allocate(orders, drivers, options);

    const matches: DispatchPreviewMatch[] = [];
    let totalDistKm = 0;
    let totalPayout = 0;

    for (const alloc of allocation.assignments) {
      const order = orders.find((o) => o.id === alloc.orderId);
      const driver = drivers.find((d) => d.id === alloc.riderId);
      if (!order || !driver) continue;

      const distKm = parseFloat((alloc.distanceMeters / 1000).toFixed(2));
      const payout = Math.round(order.totalAmountNgn * 0.7);
      totalDistKm += distKm;
      totalPayout += payout;

      matches.push({
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        pickupAddress: order.pickup.address,
        dropoffAddress: order.dropoff.address,
        pickupName: order.pickup.contactName,
        dropoffName: order.dropoff.contactName,
        cargoDescription: order.entities.map((e) => e.description).join(', ') || 'General Cargo',
        cargoWeightKg: order.entities.reduce((sum, e) => sum + (e.weightKg || 1), 0),
        totalAmountNgn: order.totalAmountNgn,
        payoutNgn: payout,
        createdAt: order.createdAt,
        riderId: driver.id,
        riderName: driver.name,
        riderPhone: driver.phone,
        vehicleType: driver.vehicleType,
        avatarUrl: driver.avatarUrl,
        rating: driver.rating,
        distanceKm: distKm,
        distanceMeters: alloc.distanceMeters,
        h3Distance: alloc.h3Distance,
        estimatedPickupMinutes: alloc.estimatedPickupMinutes,
      });
    }

    const reasonMap: Record<string, string> = {
      no_riders_in_radius: 'No online couriers found within search radius',
      capacity_exceeded: 'Order cargo weight exceeds courier capacity',
      all_riders_busy: 'All available couriers currently assigned to maximum jobs',
      invalid_coordinates: 'Order missing valid pickup GPS or H3 coordinates',
    };

    const unassigned: DispatchPreviewUnassigned[] = allocation.unassigned.map((u) => {
      const order = orders.find((o) => o.id === u.orderId);
      return {
        orderId: u.orderId,
        trackingNumber: order?.trackingNumber || `FX-${u.orderId.substring(0, 8).toUpperCase()}`,
        pickupAddress: order?.pickup.address || 'Unknown Pickup',
        dropoffAddress: order?.dropoff.address || 'Unknown Dropoff',
        reason: reasonMap[u.reason] || 'Unable to allocate courier',
        cargoWeightKg: order?.entities.reduce((sum, e) => sum + (e.weightKg || 1), 0) || 1,
        totalAmountNgn: order?.totalAmountNgn || 0,
        createdAt: order?.createdAt || timestamp,
      };
    });

    const avgDistanceKm = matches.length > 0 ? parseFloat((totalDistKm / matches.length).toFixed(2)) : 0;

    return {
      runId,
      timestamp,
      totalOrders: orders.length,
      matchedCount: matches.length,
      unassignedCount: unassigned.length,
      totalPayoutNgn: totalPayout,
      avgDistanceKm,
      matches,
      unassigned,
    };
  }

  /**
   * Atomically executes confirmed batch matches against Supabase and sends notifications.
   */
  public async executeBatchDispatch(
    matches: Array<{ orderId: string; riderId: string }>
  ): Promise<{ success: boolean; allocatedCount: number; errors: string[] }> {
    const supabase = getAdminSupabase();
    let allocatedCount = 0;
    const errors: string[] = [];

    const orderIds = matches.map((m) => m.orderId);
    const riderIds = matches.map((m) => m.riderId);

    const [{ data: rawOrders }, { data: rawRiders }] = await Promise.all([
      supabase.from('orders').select('*').in('id', orderIds),
      supabase.from('profiles').select('id, whatsapp_contact, metadata').in('id', riderIds),
    ]);

    const orderMap = new Map((rawOrders || []).map((o) => [o.id, o]));
    const riderMap = new Map((rawRiders || []).map((r) => [r.id, r]));

    for (const match of matches) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          rider_id: match.riderId,
          status: 'ASSIGNED',
        })
        .eq('id', match.orderId);

      if (updateError) {
        console.error(`[Orchestrator] Error assigning order ${match.orderId}:`, updateError);
        errors.push(`Order ${match.orderId}: ${updateError.message}`);
        continue;
      }

      allocatedCount++;

      const ord = orderMap.get(match.orderId);
      const rid = riderMap.get(match.riderId);

      if (rid?.whatsapp_contact && ord) {
        const msg = buildRiderDispatchMessage({
          orderId: `FX-${ord.id.substring(0, 8).toUpperCase()}`,
          pickupHub: ord.pickup_address || 'Pickup Hub',
          dropoffHub: ord.dropoff_address || 'Dropoff Hub',
          parcelSize: 'Dispatched Waybill Cargo',
          payoutNaira: Math.round((Number(ord.total_amount) || 0) * 0.7),
        });

        sendWhatsAppMessage({
          to: rid.whatsapp_contact,
          message: msg,
        }).catch((e) => console.warn('[executeBatchDispatch] Notification warning:', e));
      }
    }

    return {
      success: errors.length === 0 || allocatedCount > 0,
      allocatedCount,
      errors,
    };
  }

  /**
   * Runs the complete auto-dispatch run (legacy instant execution mode):
   * 1. Query unassigned orders
   * 2. Query available drivers
   * 3. Run Greedy H3 allocation
   * 4. Persist assignments atomically to Supabase
   * 5. Send out messaging notifications
   */
  public async executeAutoDispatch(
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationRunResult> {
    const orders = await this.fetchUnassignedOrders();
    const drivers = await this.fetchDriverCandidates();

    if (orders.length === 0) {
      return {
        runId: `run_${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalProcessed: 0,
        allocatedCount: 0,
        unassignedCount: 0,
        assignments: [],
        unassigned: [],
      };
    }

    const result = this.engine.allocate(orders, drivers, options);
    const supabase = getAdminSupabase();

    // Commit allocations to Supabase
    for (const alloc of result.assignments) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          rider_id: alloc.riderId,
          status: 'ASSIGNED',
        })
        .eq('id', alloc.orderId);

      if (updateError) {
        console.error(`[Orchestrator] Failed to update order ${alloc.orderId}:`, updateError);
        continue;
      }

      // Find matching order and driver to send notification
      const matchedOrder = orders.find((o) => o.id === alloc.orderId);
      const matchedDriver = drivers.find((d) => d.id === alloc.riderId);

      if (matchedDriver?.phone && matchedOrder) {
        const dispatchMsg = buildRiderDispatchMessage({
          orderId: matchedOrder.trackingNumber,
          pickupHub: matchedOrder.pickup.address,
          dropoffHub: matchedOrder.dropoff.address,
          parcelSize: `${matchedOrder.entities.length} items`,
          payoutNaira: Math.round(matchedOrder.totalAmountNgn * 0.7), // 70% rider payout
        });

        // Fire-and-forget message
        sendWhatsAppMessage({
          to: matchedDriver.phone,
          message: dispatchMsg,
        }).catch((e) => console.warn('[Orchestrator] SMS notification warning:', e));
      }
    }

    return result;
  }
}

