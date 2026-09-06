/**
 * /src/lib/telemetry/broadcaster.ts
 * Fast X Nexus — Real-Time Driver Telemetry Broadcaster
 *
 * Modeled after Fleetbase `DriverLocationChanged` event broadcasting.
 * Streams GPS coordinates to Supabase Realtime Channels, updates PostgreSQL
 * `rider_locations`, and caches latest telemetry in Upstash Redis.
 */

import { createClient } from '@supabase/supabase-js';
import * as h3 from 'h3-js';
import { cacheRiderTelemetry } from '@/lib/cache/redis';

export interface TelemetryPayload {
  riderId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  heading?: number;
  speed?: number; // km/h
  batteryLevel?: number; // percentage
  h3Cell?: string;
  timestamp?: string;
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Broadcasts driver location telemetry to Supabase Realtime and persists coordinates.
 */
export async function broadcastRiderTelemetry(payload: TelemetryPayload) {
  const timestamp = payload.timestamp || new Date().toISOString();
  const lat = payload.latitude;
  const lng = payload.longitude;

  // Compute H3 cell resolution 8 if not provided
  let cell = payload.h3Cell;
  if (!cell) {
    try {
      cell = h3.latLngToCell(lat, lng, 8);
    } catch {
      cell = '881f1d48b7fffff'; // fallback
    }
  }

  const broadcastData = {
    riderId: payload.riderId,
    orderId: payload.orderId,
    latitude: lat,
    longitude: lng,
    altitude: payload.altitude || 0,
    heading: payload.heading || 0,
    speed: payload.speed || 0,
    batteryLevel: payload.batteryLevel || 100,
    h3Cell: cell,
    timestamp,
  };

  const supabase = getAdminSupabase();

  // 1. Send Realtime broadcast on driver channel
  const riderChannel = supabase.channel(`telemetry:rider_${payload.riderId}`);
  await riderChannel.send({
    type: 'broadcast',
    event: 'location_changed',
    payload: broadcastData,
  });

  // 2. If an orderId is attached, broadcast on order channel for customer live tracking
  if (payload.orderId) {
    const orderChannel = supabase.channel(`telemetry:order_${payload.orderId}`);
    await orderChannel.send({
      type: 'broadcast',
      event: 'location_changed',
      payload: broadcastData,
    });
  }

  // 3. Upsert to rider_locations table
  const { error: dbError } = await supabase
    .from('rider_locations')
    .upsert(
      {
        rider_id: payload.riderId,
        latitude: lat,
        longitude: lng,
        h3_cell: cell,
        updated_at: timestamp,
      },
      { onConflict: 'rider_id' }
    );

  if (dbError) {
    console.warn('[Telemetry] DB upsert warning:', dbError.message);
  }

  // 4. Cache in Multi-Tier Redis Engine (1 hour TTL)
  await cacheRiderTelemetry(payload.riderId, broadcastData);

  return { success: true, data: broadcastData };
}
