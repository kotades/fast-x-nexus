'use client';

/**
 * /src/hooks/useRealtimeTelemetry.ts
 * Fast X Nexus — Real-Time Driver Telemetry Subscription Hook
 *
 * Subscribes to Supabase Realtime Channels for live driver tracking
 * with low-latency sub-second updates.
 */

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export interface LiveTelemetryData {
  riderId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  heading: number;
  speed: number;
  batteryLevel: number;
  h3Cell: string;
  timestamp: string;
}

interface UseRealtimeTelemetryOptions {
  orderId?: string;
  riderId?: string;
  initialLat?: number;
  initialLng?: number;
}

export function useRealtimeTelemetry({
  orderId,
  riderId,
  initialLat = 6.5244,
  initialLng = 3.3792,
}: UseRealtimeTelemetryOptions) {
  const [telemetry, setTelemetry] = useState<LiveTelemetryData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  const supabaseRef = useRef(createBrowserClient());

  useEffect(() => {
    if (!orderId && !riderId) return;

    const supabase = supabaseRef.current;
    const channelName = orderId
      ? `telemetry:order_${orderId}`
      : `telemetry:rider_${riderId}`;

    const channel = supabase.channel(channelName);

    channel
      .on(
        'broadcast',
        { event: 'location_changed' },
        ({ payload }: { payload: LiveTelemetryData }) => {
          if (payload && payload.latitude && payload.longitude) {
            setTelemetry(payload);
            setLastHeartbeat(new Date());
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, riderId]);

  return {
    latitude: telemetry?.latitude ?? initialLat,
    longitude: telemetry?.longitude ?? initialLng,
    heading: telemetry?.heading ?? 0,
    speed: telemetry?.speed ?? 0,
    batteryLevel: telemetry?.batteryLevel ?? 100,
    h3Cell: telemetry?.h3Cell,
    timestamp: telemetry?.timestamp,
    isConnected,
    lastHeartbeat,
    rawTelemetry: telemetry,
  };
}
