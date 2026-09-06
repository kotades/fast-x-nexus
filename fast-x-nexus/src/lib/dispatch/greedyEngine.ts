/**
 * /src/lib/dispatch/greedyEngine.ts
 * Fast X Nexus — Greedy H3 Nearest-Rider Orchestration Engine
 *
 * Direct high-performance TypeScript translation of Fleetbase's
 * `GreedyOrchestrationEngine.php`, upgraded with Uber H3 indexing.
 *
 * Algorithm:
 * 1. Sort orders by priority (descending) then scheduled_at / created_at (ascending).
 * 2. For each order, compute the pickup H3 cell (resolution 8/9).
 * 3. Search driver candidates within increasing H3 rings (`gridDisk(pickupCell, k)`).
 * 4. Filter candidate drivers by availability, vehicle capacity, and online status.
 * 5. Rank remaining drivers by Euclidean/Haversine proximity + driver rating.
 * 6. Assign the best driver and update driver capacity for subsequent allocations in the batch.
 */

import * as h3 from 'h3-js';
import {
  OrchestrationOrder,
  DriverCandidate,
  AllocationResult,
  UnassignedResult,
  OrchestrationRunResult,
  OrchestrationOptions,
} from './types';

// Haversine distance in meters
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class GreedyH3OrchestrationEngine {
  public static readonly IDENTIFIER = 'greedy_h3';
  public static readonly NAME = 'Greedy H3 Nearest-Rider Engine';

  /**
   * Run allocation over a batch of orders and available drivers.
   */
  public allocate(
    orders: OrchestrationOrder[],
    drivers: DriverCandidate[],
    options: OrchestrationOptions = {}
  ): OrchestrationRunResult {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const allowMulti = options.allowMultiOrder ?? false;
    const maxOrdersPerRider = options.maxOrdersPerRider ?? 3;
    const maxKrings = options.maxRadiusH3Krings ?? 5; // Search up to 5 rings (~5-8km radius)

    // Sort orders: highest priority first, then earliest created/scheduled
    const sortedOrders = [...orders].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const timeA = new Date(a.scheduledAt || a.createdAt).getTime();
      const timeB = new Date(b.scheduledAt || b.createdAt).getTime();
      return timeA - timeB;
    });

    // Create mutable driver pool tracking simulated assignments during this run
    const driverPool = drivers
      .filter((d) => d.isOnline)
      .map((d) => {
        let cell = d.currentH3Cell;
        if (!cell && d.currentLat !== undefined && d.currentLng !== undefined) {
          try {
            cell = h3.latLngToCell(d.currentLat, d.currentLng, 8);
          } catch {
            cell = undefined;
          }
        }
        return {
          ...d,
          currentH3Cell: cell,
          assignedCountThisRun: d.assignedOrdersCount,
        };
      });

    const assignments: AllocationResult[] = [];
    const unassigned: UnassignedResult[] = [];

    for (const order of sortedOrders) {
      const pickup = order.pickup;
      if (!pickup || (!pickup.h3Cell && (pickup.lat === undefined || pickup.lng === undefined))) {
        unassigned.push({
          orderId: order.id,
          reason: 'invalid_coordinates',
        });
        continue;
      }

      let pickupCell = pickup.h3Cell;
      if (!pickupCell && pickup.lat !== undefined && pickup.lng !== undefined) {
        try {
          pickupCell = h3.latLngToCell(pickup.lat, pickup.lng, 8);
        } catch {
          pickupCell = '';
        }
      }

      // Calculate total weight of cargo
      const cargoWeight = order.entities.reduce((sum, e) => sum + (e.weightKg || 1), 0);

      // Find best driver
      let bestDriverIdx: number | null = null;
      let bestScore = Infinity;
      let bestDistanceMeters = 0;
      let bestH3Distance = 0;

      for (let i = 0; i < driverPool.length; i++) {
        const driver = driverPool[i];

        // Capacity check
        if (!allowMulti && driver.assignedCountThisRun > 0) {
          continue;
        }
        if (allowMulti && driver.assignedCountThisRun >= maxOrdersPerRider) {
          continue;
        }
        if (cargoWeight > driver.maxCapacityKg) {
          continue;
        }

        // Distance computation via H3 grid distance or Haversine fallback
        let h3Dist = 0;
        let distMeters = 0;

        if (pickupCell && driver.currentH3Cell) {
          try {
            h3Dist = h3.gridDistance(pickupCell, driver.currentH3Cell);
          } catch {
            h3Dist = 999;
          }
        }

        if (
          driver.currentLat !== undefined &&
          driver.currentLng !== undefined &&
          pickup.lat !== undefined &&
          pickup.lng !== undefined
        ) {
          distMeters = haversineDistanceMeters(
            driver.currentLat,
            driver.currentLng,
            pickup.lat,
            pickup.lng
          );
        } else {
          distMeters = h3Dist * 1000; // rough proxy
        }

        // Radius filter
        if (h3Dist > maxKrings && distMeters > maxKrings * 1200) {
          continue;
        }

        // Scoring: Distance penalized, rating rewarded
        // Score = distance_meters / (rating_factor)
        const ratingFactor = Math.max(driver.rating || 4.0, 1.0) / 5.0; // 0.2 to 1.0
        const score = distMeters / ratingFactor;

        if (score < bestScore) {
          bestScore = score;
          bestDriverIdx = i;
          bestDistanceMeters = distMeters;
          bestH3Distance = h3Dist;
        }
      }

      if (bestDriverIdx !== null) {
        const matchedDriver = driverPool[bestDriverIdx];
        matchedDriver.assignedCountThisRun += 1;

        // Estimated arrival at ~30km/h average urban speed (500m/min) + 2 min prep
        const estimatedMinutes = Math.max(Math.ceil(bestDistanceMeters / 500) + 2, 3);

        assignments.push({
          orderId: order.id,
          riderId: matchedDriver.id,
          riderName: matchedDriver.name,
          distanceMeters: Math.round(bestDistanceMeters),
          estimatedPickupMinutes: estimatedMinutes,
          h3Distance: bestH3Distance,
          algorithm: 'greedy_h3',
          allocatedAt: new Date().toISOString(),
        });
      } else {
        unassigned.push({
          orderId: order.id,
          reason: driverPool.length === 0 ? 'no_riders_in_radius' : 'all_riders_busy',
        });
      }
    }

    return {
      runId,
      timestamp: new Date().toISOString(),
      totalProcessed: sortedOrders.length,
      allocatedCount: assignments.length,
      unassignedCount: unassigned.length,
      assignments,
      unassigned,
    };
  }
}
