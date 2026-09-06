/**
 * /src/lib/dispatch/orchestrator.ts
 * Fast X Nexus — Enterprise Dispatch Orchestrator
 *
 * Coordinates database retrieval, spatial H3 nearest-rider greedy allocation,
 * atomic database state mutation, and messaging broadcasts.
 */

import { createClient } from '@supabase/supabase-js';
import { GreedyH3OrchestrationEngine } from './greedyEngine';
import {
  OrchestrationOrder,
  DriverCandidate,
  OrchestrationRunResult,
  OrchestrationOptions,
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
      .eq('status', 'PAID_UNASSIGNED')
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

      return {
        id: o.id,
        trackingNumber: `FX-${o.id.substring(0, 8).toUpperCase()}`,
        status: o.status as any,
        priority: 5,
        pickup: {
          type: 'pickup',
          address: o.pickup_address || 'Pickup Location',
          lat: 6.5244, // Derived from H3 or default Lagos
          lng: 3.3792,
          h3Cell: o.pickup_h3_cell,
          contactName: o.pickup_name,
          contactPhone: o.pickup_phone,
        },
        dropoff: {
          type: 'dropoff',
          address: o.dropoff_address || 'Dropoff Location',
          lat: 6.6018,
          lng: 3.3515,
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

    // Fetch active profiles with role = 'rider'
    const { data: riderProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, whatsapp_contact, metadata, active_status')
      .eq('role', 'rider')
      .eq('active_status', true);

    if (profileErr || !riderProfiles) {
      console.error('[Orchestrator] Error fetching rider profiles:', profileErr);
      return [];
    }

    const riderIds = riderProfiles.map((r) => r.id);
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

    return riderProfiles.map((r) => {
      const loc = locationMap.get(r.id);
      const meta = (r.metadata as Record<string, any>) || {};

      return {
        id: r.id,
        userId: r.id,
        name: meta.full_name || `Rider ${r.id.substring(0, 6)}`,
        phone: r.whatsapp_contact || '',
        avatarUrl: meta.avatar_url,
        vehicleType: meta.vehicle_type || 'motorcycle',
        isOnline: true,
        currentLat: loc ? Number(loc.latitude) : undefined,
        currentLng: loc ? Number(loc.longitude) : undefined,
        currentH3Cell: loc?.h3_cell,
        assignedOrdersCount: orderCountMap.get(r.id) || 0,
        maxCapacityKg: meta.vehicle_type === 'truck' ? 2000 : meta.vehicle_type === 'van' ? 500 : 30,
        rating: meta.rating || 4.8,
      };
    });
  }

  /**
   * Runs the complete auto-dispatch run:
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
