'use client';

/**
 * /src/components/rider/telemetry/RiderTelemetryWatcher.tsx
 * Fast X Nexus — Persistent Rider Geolocation & Telemetry Watcher
 *
 * Runs continuously in RiderDashboardLayout to ensure the courier's GPS
 * coordinates and H3 resolution 8 cell stream in real time to the backend,
 * Redis cache, and Supabase Realtime broadcast channels (fleet_telemetry_radar & telemetry:order_id).
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { updateRiderLocation } from '@/app/actions/rider';
import { isWithinNigeria } from '@/lib/geo/cascadingGeocoder';
import { useRiderDashboardSafe } from '@/components/rider/contexts/RiderDashboardContext';

interface Coordinates {
  lat: number;
  lng: number;
}

// Default Lagos Mainland / Ikeja operational coordinates
const DEFAULT_LAGOS_COORDS: Coordinates = {
  lat: 6.598,
  lng: 3.354,
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function RiderTelemetryWatcher() {
  const riderCtx = useRiderDashboardSafe();
  const activeJob = riderCtx?.activeJob;

  const [coords, setCoords] = useState<Coordinates>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fastx_rider_live_coords');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lat && parsed.lng && isWithinNigeria(parsed.lat, parsed.lng)) {
            return { lat: parsed.lat, lng: parsed.lng };
          }
        }
      } catch {}
    }
    return DEFAULT_LAGOS_COORDS;
  });

  const [status, setStatus] = useState<'acquiring' | 'locked' | 'watching' | 'simulated' | 'error'>('acquiring');
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [h3Cell, setH3Cell] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const lastCoordsRef = useRef<Coordinates>(coords);
  const lastSyncTimeRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Sync coordinates to backend via server action
  const syncCoordinates = useCallback(
    async (lat: number, lng: number, currentSpeed?: number, currentHeading?: number) => {
      if (isSyncingRef.current) return;
      if (!isWithinNigeria(lat, lng)) return;

      try {
        isSyncingRef.current = true;
        const speedVal = currentSpeed !== undefined && currentSpeed !== null ? Math.round(currentSpeed * 3.6) : 0; // m/s to km/h
        const headingVal = currentHeading !== undefined && currentHeading !== null ? Math.round(currentHeading) : 0;

        const res = await updateRiderLocation(
          lat,
          lng,
          activeJob?.orderId,
          undefined,
          speedVal,
          headingVal
        );

        if (res.success && res.data?.h3_cell) {
          setH3Cell(res.data.h3_cell);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSyncTime(timeStr);
          lastSyncTimeRef.current = Date.now();
          lastCoordsRef.current = { lat, lng };

          // Notify any other components on the page
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                'fastx_rider_live_coords',
                JSON.stringify({ lat, lng, h3Cell: res.data.h3_cell, timestamp: Date.now() })
              );
              window.dispatchEvent(
                new CustomEvent('fastx:rider:location_updated', {
                  detail: { lat, lng, h3Cell: res.data.h3_cell, speed: speedVal, heading: headingVal },
                })
              );
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[RiderTelemetryWatcher] Sync warning:', err);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [activeJob?.orderId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let watchId: number | null = null;

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, speed: rawSpeed, heading: rawHeading } = pos.coords;

      if (isWithinNigeria(latitude, longitude)) {
        setStatus('watching');
        setCoords({ lat: latitude, lng: longitude });
        setSpeed(rawSpeed ? Math.round(rawSpeed * 3.6) : 0);
        setHeading(rawHeading ? Math.round(rawHeading) : 0);

        const now = Date.now();
        const dist = calculateDistanceMeters(
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lng,
          latitude,
          longitude
        );

        // Send telemetry if > 3.5s elapsed or courier moved >= 5 meters
        if (now - lastSyncTimeRef.current > 3500 || dist >= 5) {
          syncCoordinates(latitude, longitude, rawSpeed || 0, rawHeading || 0);
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('[RiderTelemetryWatcher] GPS watch notice:', err.message);
      // If permission denied or hardware unavailable, fallback to simulated locked state in Lagos
      setStatus('simulated');
      syncCoordinates(coords.lat, coords.lng, 24, 45);
    };

    if ('geolocation' in navigator) {
      // 1. Initial lock
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStatus('locked');
          handleSuccess(pos);
          syncCoordinates(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0, pos.coords.heading || 0);
        },
        handleError,
        { enableHighAccuracy: true, timeout: 7000 }
      );

      // 2. Continuous watch
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      });
    } else {
      setStatus('simulated');
      syncCoordinates(coords.lat, coords.lng, 24, 45);
    }

    // Keepalive interval every 10 seconds if idle
    const keepaliveInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastSyncTimeRef.current > 10000) {
        syncCoordinates(coords.lat, coords.lng, speed, heading);
      }
    }, 10000);

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(keepaliveInterval);
    };
  }, [syncCoordinates, coords.lat, coords.lng, speed, heading]);

  // Headless background telemetry watcher (no visual UI clutter)
  return null;
}
