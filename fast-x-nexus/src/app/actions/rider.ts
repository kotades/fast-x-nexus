'use server';

/**
 * /src/app/actions/rider.ts
 * Fast X Nexus — Rider Geolocation & Telemetry Actions
 *
 * Implements real-time rider location tracking and proximity matching.
 * Leverages Uber H3 indexing and Upstash Redis for low-latency writes.
 */

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { coordinateToH3Zone, getZoneNeighbors, calculateDistanceKm } from '@/lib/h3';
import { cellToLatLng } from 'h3-js';
import type { ActionResult } from './booking';
import type { RiderLocation } from '@/types/database.types';

/**
 * Updates a rider's live geolocation in both Supabase (persistent)
 * and Upstash Redis (high-speed ephemeral telemetry cache).
 */
export async function updateRiderLocation(
  lat: number,
  lng: number
): Promise<ActionResult<{ h3_cell: string }>> {
  // 1. Authenticate user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 2. Verify user role is rider
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'User profile not found.' };
  }

  if (profile.role !== 'rider') {
    return { success: false, error: 'Unauthorized: Rider privileges required.' };
  }

  // 3. Compute H3 Cell at resolution 7
  const h3Result = coordinateToH3Zone(lat, lng, 7);
  if (!h3Result.isValid) {
    return { success: false, error: 'Invalid coordinates mapped to H3.' };
  }

  const h3Cell = h3Result.h3Index;

  // 4. Persistence — Upsert into Supabase public.rider_locations
  const { error: upsertError } = await supabase
    .from('rider_locations')
    .upsert({
      rider_id: user.id,
      latitude: lat,
      longitude: lng,
      h3_cell: h3Cell,
      updated_at: new Date().toISOString()
    });

  if (upsertError) {
    console.error('[updateRiderLocation] Supabase upsert error:', upsertError);
    return { success: false, error: 'Failed to persist rider location.' };
  }

  // 5. Ephemeral Cache — Set in Upstash Redis with 60-second TTL
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const key = `telemetry:rider:${user.id}:cell`;
    try {
      const response = await fetch(`${redisUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', key, h3Cell, 'EX', 60]),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[updateRiderLocation] Upstash Redis SET failed:', responseText);
      }
    } catch (redisError) {
      console.error('[updateRiderLocation] Upstash Redis network error:', redisError);
    }
  } else {
    console.warn('[updateRiderLocation] Upstash credentials not set. Ephemeral caching skipped.');
  }

  return { success: true, data: { h3_cell: h3Cell } };
}

export interface NearbyRiderMatch {
  rider_id: string;
  latitude: number;
  longitude: number;
  h3_cell: string;
  distanceKm: number;
  updated_at: string;
}

/**
 * Searches for nearby active riders within a given H3 ring radius of
 * the order's pickup location, sorted by actual great-circle distance.
 */
export async function getNearbyRiders(
  orderId: string,
  ringSize: number = 1
): Promise<ActionResult<NearbyRiderMatch[]>> {
  // 1. Authenticate caller
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // 2. Fetch the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('pickup_h3_cell')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Order not found.' };
  }

  const pickupCell = order.pickup_h3_cell;

  // 3. Generate ring neighbors (ringSize 1 = pickup cell + immediate 6 surrounding cells)
  let cells: string[];
  try {
    cells = getZoneNeighbors(pickupCell, ringSize);
  } catch (err: any) {
    console.error('[getNearbyRiders] Failed to get H3 neighbors:', err);
    return { success: false, error: 'Invalid pickup H3 cell configuration.' };
  }

  // 4. Query DB using SQL RPC
  const { data: riders, error: rpcError } = await supabase.rpc(
    'get_nearby_active_riders',
    { p_h3_cells: cells }
  );

  if (rpcError) {
    console.error('[getNearbyRiders] Database RPC error:', rpcError);
    return { success: false, error: 'Failed to search active riders.' };
  }

  // 5. Compute great-circle distance and sort
  const [pickupLat, pickupLng] = cellToLatLng(pickupCell);
  const pickupLatLng = { lat: pickupLat, lng: pickupLng };

  const matches: NearbyRiderMatch[] = (riders || []).map((r: any) => {
    const riderLatLng = { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) };
    const distanceKm = calculateDistanceKm(pickupLatLng, riderLatLng);

    return {
      rider_id: r.rider_id,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      h3_cell: r.h3_cell,
      distanceKm: parseFloat(distanceKm.toFixed(3)),
      updated_at: r.updated_at
    };
  });

  // Sort ascending by distance
  matches.sort((a, b) => a.distanceKm - b.distanceKm);

  return { success: true, data: matches };
}

/**
 * Fetches all orders currently in the pool (PAID_UNASSIGNED status)
 */
export async function getAvailableJobs(): Promise<ActionResult<any[]>> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'PAID_UNASSIGNED')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAvailableJobs] DB error:', error);
    return { success: false, error: 'Failed to fetch available jobs.' };
  }

  return { success: true, data };
}

/**
 * Fetches the active assigned jobs for the logged in rider
 */
export async function getActiveRiderJobs(): Promise<ActionResult<any[]>> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['ASSIGNED', 'PICKED_UP'])
    .eq('rider_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getActiveRiderJobs] DB error:', error);
    return { success: false, error: 'Failed to fetch active jobs.' };
  }

  return { success: true, data };
}

