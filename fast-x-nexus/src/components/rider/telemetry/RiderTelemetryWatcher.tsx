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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

  return (
    <aside
      aria-label="Rider Live Telemetry Indicator"
      className="fixed bottom-4 right-4 z-[999] pointer-events-auto select-none"
    >
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-lg overflow-hidden transition-all duration-200">
        {/* Compact Pill */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
          title="Click to view full GPS telemetry stream"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'watching' || status === 'locked'
                  ? 'bg-emerald-400'
                  : status === 'simulated'
                  ? 'bg-primary'
                  : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                status === 'watching' || status === 'locked'
                  ? 'bg-emerald-500'
                  : status === 'simulated'
                  ? 'bg-primary'
                  : 'bg-amber-500'
              }`}
            ></span>
          </span>

          <span className="font-mono text-[11px] font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">GPS</span>
            <span>
              {status === 'watching' || status === 'locked' ? 'ACTIVE' : status === 'simulated' ? 'SIMULATED' : 'ACQUIRING'}
            </span>
          </span>

          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
          </span>

          <span className="material-symbols-outlined text-xs text-slate-400">
            {isExpanded ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {/* Expanded Telemetry Drawer */}
        {isExpanded && (
          <div className="border-t border-slate-100 p-2.5 bg-slate-50/50 space-y-1.5 font-mono text-[10px] text-slate-600 min-w-[240px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">H3 Index (Res 8):</span>
              <span className="font-bold text-slate-900">{h3Cell || 'Calculating...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Speed / Heading:</span>
              <span className="font-bold text-slate-900">{speed} km/h • {heading}°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Last Telemetry Ping:</span>
              <span className="font-bold text-slate-900">{lastSyncTime || 'Pending'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Cargo Bound:</span>
              <span className="font-bold text-emerald-700">
                {activeJob?.orderId ? `#${activeJob.orderId.substring(0, 8)}` : 'Standby'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
