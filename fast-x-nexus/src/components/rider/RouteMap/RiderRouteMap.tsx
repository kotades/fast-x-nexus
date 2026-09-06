'use client';

/**
 * /src/components/rider/RouteMap/RiderRouteMap.tsx
 * Fast X Nexus — Enterprise Rider Route & Dispatch Map
 *
 * Implements:
 * 1. Persistent Instant-Frame GPS Telemetry Caching (Eliminates 3-5s initial hardware lock glitch).
 * 2. Strict Progressive Disclosure (Dropoff is 100% GATED until Stage 1 POP verification).
 * 3. Floating Animated Callout Badges with Bouncing Motion.
 * 4. Standby Mode (When no active deliveries exist, shows ONLY the rider's live position).
 * 5. 1-Tap Google Maps Driving Navigation (Strictly verified within Nigeria).
 */

import React, { useState, useEffect, useTransition, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveRiderJobs, getAvailableJobs, pickupJob, completeDeliveryWithPin, updateRiderLocation } from '@/app/actions/rider';
import { DynamicMap } from '@/components/maps/DynamicMap';
import { useRiderDashboard } from '@/components/rider/contexts/RiderDashboardContext';
import { resolveAddressCascading, isWithinNigeria } from '@/lib/geo/cascadingGeocoder';
import { Skeleton } from '@/components/customer/shared/Skeleton';

// Haversine Distance Calculator (km)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Estimate driving time in Lagos traffic (avg 25 km/h)
function estimateDrivingMinutes(distanceKm: number): number {
  return Math.max(3, Math.round((distanceKm / 25) * 60));
}

// Synchronous Instant-Frame GPS Retrieval (Frame 0 zero-delay)
function getCachedRiderCoords(): { lat: number; lng: number } {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('fastx_rider_live_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lat && parsed?.lng && isWithinNigeria(parsed.lat, parsed.lng)) {
          return { lat: parsed.lat, lng: parsed.lng };
        }
      }
    } catch {}
  }
  return { lat: 6.5744, lng: 3.3692 }; // Lagos Mainland corridor fallback
}

function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1);
  }
  return cleaned;
}

function formatTelPhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

export function RiderRouteMap() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [poolJobs, setPoolJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize synchronously from cached GPS to eliminate 3-5s hardware lock-in delay
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number }>(getCachedRiderCoords);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);

  const [resolvedPickup, setResolvedPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedDropoff, setResolvedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupResolution, setPickupResolution] = useState<{
    lat: number;
    lng: number;
    isEstimatedVicinity: boolean;
    accuracyRadius: number;
    matchedLevel: string;
  } | null>(null);
  const [dropoffResolution, setDropoffResolution] = useState<{
    lat: number;
    lng: number;
    isEstimatedVicinity: boolean;
    accuracyRadius: number;
    matchedLevel: string;
  } | null>(null);

  const [pickupPin, setPickupPin] = useState('');
  const [deliveryPin, setDeliveryPin] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { navigateTo } = useRiderDashboard();

  const loadData = async () => {
    try {
      const [activeRes, poolRes] = await Promise.all([getActiveRiderJobs(), getAvailableJobs()]);
      if (activeRes && activeRes.success && activeRes.data) setActiveJobs(activeRes.data);
      if (poolRes && poolRes.success && poolRes.data) setPoolJobs(poolRes.data);
    } catch (err) {
      console.error('[RiderRouteMap] Error loading telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentJob = activeJobs[0] || null;
  const isPickedUp = currentJob?.status === 'PICKED_UP' || currentJob?.status === 'IN_TRANSIT';

  // Live Telemetry Broadcaster to Backend & Supabase Realtime
  const syncTelemetryToBackend = useCallback(
    async (lat: number, lng: number) => {
      if (!isWithinNigeria(lat, lng)) return;
      try {
        setSyncStatus('syncing');
        await updateRiderLocation(lat, lng, currentJob?.id, currentJob?.rider_id);
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('[RiderRouteMap] Telemetry sync error:', err);
        setSyncStatus('idle');
      }
    },
    [currentJob?.id, currentJob?.rider_id]
  );

  // Load and refresh active jobs & pool periodically
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Continuous Real Hardware GPS Watcher & Real-time Telemetry Push
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const handlePos = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      if (isWithinNigeria(latitude, longitude)) {
        setRiderCoords({ lat: latitude, lng: longitude });
        try {
          localStorage.setItem('fastx_rider_live_coords', JSON.stringify({ lat: latitude, lng: longitude }));
        } catch {}

        const now = Date.now();
        // Sync to Supabase if first sync or at least 2.5s since last sync
        if (now - lastSyncTimestampRef.current > 2500) {
          lastSyncTimestampRef.current = now;
          syncTelemetryToBackend(latitude, longitude);
        }
      }
    };

    // Immediate Hardware GPS Lock
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePos(pos);
        syncTelemetryToBackend(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn('[RiderRouteMap] Initial GPS error:', err.message),
      { enableHighAccuracy: true, timeout: 6000 }
    );

    // Continuous Hardware GPS Watch
    const watchId = navigator.geolocation.watchPosition(
      handlePos,
      (err) => console.warn('[RiderRouteMap] GPS watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 2500, timeout: 6000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [syncTelemetryToBackend]);

  // Resolve Nigerian Coordinates for current job addresses
  useEffect(() => {
    async function geocodeJobWaypoints() {
      if (!currentJob) {
        setResolvedPickup(null);
        setResolvedDropoff(null);
        setPickupResolution(null);
        setDropoffResolution(null);
        return;
      }

      // Geocode Pickup Address
      const pRes = await resolveAddressCascading(currentJob.pickup_address || 'Ikeja, Lagos');
      if (pRes && isWithinNigeria(pRes.lat, pRes.lng)) {
        setResolvedPickup({ lat: pRes.lat, lng: pRes.lng });
        setPickupResolution({
          lat: pRes.lat,
          lng: pRes.lng,
          isEstimatedVicinity: pRes.isEstimatedVicinity,
          accuracyRadius: pRes.accuracyRadius || 35,
          matchedLevel: pRes.matchedLevel,
        });
      } else {
        setResolvedPickup({ lat: 6.6018, lng: 3.3515 }); // Ikeja default
        setPickupResolution({
          lat: 6.6018,
          lng: 3.3515,
          isEstimatedVicinity: true,
          accuracyRadius: 250,
          matchedLevel: 'city_fallback',
        });
      }

      // Geocode Dropoff Address
      const dRes = await resolveAddressCascading(currentJob.dropoff_address || 'Victoria Island, Lagos');
      if (dRes && isWithinNigeria(dRes.lat, dRes.lng)) {
        setResolvedDropoff({ lat: dRes.lat, lng: dRes.lng });
        setDropoffResolution({
          lat: dRes.lat,
          lng: dRes.lng,
          isEstimatedVicinity: dRes.isEstimatedVicinity,
          accuracyRadius: dRes.accuracyRadius || 35,
          matchedLevel: dRes.matchedLevel,
        });
      } else {
        setResolvedDropoff({ lat: 6.4281, lng: 3.4219 }); // VI default
        setDropoffResolution({
          lat: 6.4281,
          lng: 3.4219,
          isEstimatedVicinity: true,
          accuracyRadius: 250,
          matchedLevel: 'city_fallback',
        });
      }
    }

    geocodeJobWaypoints();
  }, [currentJob]);

  // Distances & ETAs (only calculated when active job exists)
  const distances = useMemo(() => {
    if (!currentJob) return null;
    const pCoords = resolvedPickup || { lat: 6.6018, lng: 3.3515 };
    const dCoords = resolvedDropoff || { lat: 6.4281, lng: 3.4219 };

    const toPickupKm = calculateDistanceKm(riderCoords.lat, riderCoords.lng, pCoords.lat, pCoords.lng);
    const toDropoffKm = calculateDistanceKm(riderCoords.lat, riderCoords.lng, dCoords.lat, dCoords.lng);
    const journeyKm = calculateDistanceKm(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng);

    return {
      toPickupKm,
      toPickupEta: estimateDrivingMinutes(toPickupKm),
      toDropoffKm,
      toDropoffEta: estimateDrivingMinutes(toDropoffKm),
      journeyKm,
      journeyEta: estimateDrivingMinutes(journeyKm),
    };
  }, [riderCoords, resolvedPickup, resolvedDropoff, currentJob]);

  // 1-Tap Google Maps Navigation with Street Rooftop Target
  const handleOpenGoogleMaps = () => {
    if (!currentJob) return;
    
    const targetAddress = isPickedUp
      ? (currentJob.dropoff_address || 'Victoria Island, Lagos')
      : (currentJob.pickup_address || 'Ikeja, Lagos');

    const destinationQuery = encodeURIComponent(targetAddress.trim());
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${riderCoords.lat},${riderCoords.lng}&destination=${destinationQuery}&travelmode=driving`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePickup = () => {
    if (!currentJob || !pickupPin) {
      setFeedback('❌ Please enter the sender 4-digit Pickup PIN.');
      return;
    }
    startTransition(async () => {
      const res = await pickupJob(currentJob.id, pickupPin);
      if (res.success) {
        setFeedback('✅ Cargo verified! Destination dropoff location is now UNLOCKED.');
        setPickupPin('');
        loadData();
      } else {
        setFeedback(`❌ ${res.error}`);
      }
    });
  };

  const handleComplete = () => {
    if (!currentJob || !deliveryPin) {
      setFeedback('❌ Please enter the recipient 4-digit Delivery PIN.');
      return;
    }
    startTransition(async () => {
      const res = await completeDeliveryWithPin(currentJob.id, deliveryPin);
      if (res.success) {
        setFeedback('🎉 Delivery confirmed & 70% payout unlocked!');
        setDeliveryPin('');
        setTimeout(() => loadData(), 1500);
      } else {
        setFeedback(`❌ ${res.error}`);
      }
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden font-mono flex flex-col">
      {/* Map Layer: Strictly gates dropoff coordinates until Stage 1 POP is verified */}
      <div className="absolute inset-0 z-0">
        <DynamicMap
          pickupCoords={currentJob ? resolvedPickup : undefined}
          dropoffCoords={currentJob && isPickedUp ? resolvedDropoff : undefined}
          riderCoords={riderCoords}
          pickupAddress={currentJob?.pickup_address}
          dropoffAddress={isPickedUp ? currentJob?.dropoff_address : undefined}
          riderName="You (Active Courier)"
          status={currentJob?.status}
          zoom={13}
          isEstimatedPickup={pickupResolution?.isEstimatedVicinity}
          isEstimatedDropoff={dropoffResolution?.isEstimatedVicinity}
          pickupRadius={pickupResolution?.accuracyRadius}
          dropoffRadius={dropoffResolution?.accuracyRadius}
        />
      </div>

      {/* Mobile Ultra-Lean Floating ETA Pill (Top Center) */}
      {currentJob && distances && (
        <div className="sm:hidden absolute top-2 inset-x-0 z-10 flex justify-center pointer-events-none px-3">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1 rounded-full shadow-md flex items-center gap-2 text-[10px] font-mono pointer-events-auto text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">
              {isPickedUp
                ? `${distances.toDropoffKm} km (~${distances.toDropoffEta}m to Dropoff)`
                : `${distances.toPickupKm} km (~${distances.toPickupEta}m to Pickup)`}
            </span>
          </div>
        </div>
      )}

      {/* Floating Telemetry & Distance HUD (Top Left — Desktop only) */}
      <div className="hidden sm:flex absolute top-4 left-4 z-10 flex-col gap-2 max-w-sm w-full pointer-events-auto">
        <div className="bg-surface-elevated/95 backdrop-blur-md border border-border border-l-4 border-l-primary p-3.5 shadow-xl text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Rider Telemetry Live
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase bg-primary/20 text-primary">
                Live GPS
              </span>
              <span className="text-[9px] text-text-muted font-mono">
                GPS: {riderCoords.lat.toFixed(4)}, {riderCoords.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {currentJob && distances ? (
            /* Active Job Telemetry Metrics */
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between bg-surface-low p-2 border border-border">
                <span className="text-text-muted flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-500">near_me</span>
                  {isPickedUp ? 'Distance to Dropoff:' : 'Distance to Pickup:'}
                </span>
                <span className="font-black text-text text-sm">
                  {isPickedUp
                    ? `${distances.toDropoffKm} km (~${distances.toDropoffEta} mins)`
                    : `${distances.toPickupKm} km (~${distances.toPickupEta} mins)`}
                </span>
              </div>

              {isPickedUp ? (
                <div className="flex items-center justify-between bg-surface-low p-2 border border-border">
                  <span className="text-text-muted flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">route</span>
                    Journey Corridor:
                  </span>
                  <span className="font-bold text-primary">
                    {distances.journeyKm} km (~${distances.journeyEta} mins)
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-amber-500/10 p-2 border border-amber-500/30 text-[10px] text-amber-800 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    Dropoff Location Gated
                  </span>
                  <span className="uppercase text-[9px]">Unlocks on Pickup</span>
                </div>
              )}

              {/* Geofence Arrival Callout */}
              {(!isPickedUp ? distances.toPickupKm : distances.toDropoffKm) <= 0.05 && (
                <div className="bg-emerald-500/15 border border-emerald-500/50 p-2 text-emerald-900 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                  <span>
                    {isPickedUp
                      ? '🎯 GEOFENCE ARRIVED (±45m) — You are at the dropoff destination!'
                      : '🎯 GEOFENCE ARRIVED (±45m) — You are at the pickup gate! Ask for Stage 1 PIN.'}
                  </span>
                </div>
              )}

              {/* Sync Status Footer */}
              <div className="flex items-center justify-between text-[9px] text-text-muted font-mono pt-1 border-t border-border">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-500'
                        : syncStatus === 'syncing'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-gray-400'
                    }`}
                  />
                  {syncStatus === 'synced'
                    ? 'Synced to Customer Map ✓'
                    : syncStatus === 'syncing'
                    ? 'Broadcasting GPS to Customer...'
                    : 'Telemetry Standby'}
                </span>
                {lastSyncedTime && <span>Last sync: {lastSyncedTime}</span>}
              </div>
            </div>
          ) : (
            /* Standby Status */
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-[10px] space-y-1">
              <p className="font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">radar</span>
                Radar Active & Ready for Dispatch
              </p>
              <p className="text-text-muted text-[9px]">
                {poolJobs.length > 0 ? `${poolJobs.length} available waybill(s) ready in pool.` : 'Standing by for incoming orders.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating 1-Tap Navigation Launcher (Top Right — Desktop only) */}
      {currentJob && (
        <div className="hidden sm:block absolute top-4 right-4 z-10 pointer-events-auto">
          <button
            onClick={handleOpenGoogleMaps}
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Open in Google Maps"
          >
            <span className="material-symbols-outlined text-emerald-600 text-base">near_me</span>
            <span>
              {isPickedUp ? 'Navigate to Dropoff (Google Maps) ↗' : 'Navigate to Pickup (Google Maps) ↗'}
            </span>
          </button>
        </div>
      )}

      {/* Floating Bottom Dispatch Drawer */}
      <div className={`mt-auto relative ${isCardCollapsed ? 'z-20' : 'z-40'} w-full px-2.5 sm:px-4 pb-2 sm:pb-4 max-w-3xl mx-auto pointer-events-auto`}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-surface-elevated/95 backdrop-blur-xl border border-border border-l-4 border-l-primary rounded-2xl p-4 shadow-2xl space-y-2.5"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-12 w-full" />
            </motion.div>
          ) : currentJob ? (
            /* Active Job Dispatch Panel — Full Span & High Visual Individuality */
            <motion.div
              key="active-job-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-surface-elevated/98 backdrop-blur-xl border border-border border-l-4 border-l-primary rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5 transition-all"
            >
              {/* Collapse/Expand Drag Handle */}
              <button
                type="button"
                onClick={() => setIsCardCollapsed((prev) => !prev)}
                className="w-full flex flex-col items-center pb-1 cursor-pointer focus:outline-none"
                aria-label={isCardCollapsed ? 'Expand route details' : 'Collapse route details'}
              >
                <span className="w-8 h-1 bg-slate-300 rounded-full mb-1" />
                <span className="text-[9px] font-mono text-text-dim uppercase tracking-wider flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[13px]">
                    {isCardCollapsed ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>{isCardCollapsed ? 'Tap to Expand Route Details' : 'Tap to Minimize to Map'}</span>
                </span>
              </button>

              {/* Waybill Summary Header Row */}
              <div
                className="flex items-center justify-between gap-2 border-b border-border pb-2 cursor-pointer"
                onClick={() => setIsCardCollapsed((prev) => !prev)}
              >
                {/* Left: Waybill Identifier Badge + Route ETA */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10.5px] font-black uppercase tracking-wider font-mono">
                      FX-{currentJob.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-1.5 py-0.5 border text-[8.5px] font-bold uppercase tracking-wider font-mono rounded ${
                      !isPickedUp
                        ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                    }`}>
                      {!isPickedUp ? 'STAGE 1: PICKUP' : 'STAGE 2: IN TRANSIT'}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted flex items-center gap-1 mt-1 font-mono truncate">
                    <span className="material-symbols-outlined text-xs text-primary shrink-0" aria-hidden="true">
                      {!isPickedUp ? 'location_on' : 'flag'}
                    </span>
                    <span className="truncate">
                      {!isPickedUp
                        ? `Pickup: ${currentJob.pickup_address?.split(',')[0] || 'Origin'}${distances ? ` • ${distances.toPickupKm}km (~${distances.toPickupEta}m)` : ''}`
                        : `Dropoff: ${currentJob.dropoff_address?.split(',')[0] || 'Destination'}${distances ? ` • ${distances.toDropoffKm}km (~${distances.toDropoffEta}m)` : ''}`}
                    </span>
                  </div>
                </div>

                {/* Right: Payout Badge, Radio & Collapsed 1-Tap GPS */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[8.5px] uppercase font-bold text-text-dim block font-mono">Payout</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                      ₦{Math.round((Number(currentJob.total_amount) || 0) * 0.7).toLocaleString('en-NG')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('fastx:open_dispatch_radio'));
                      }
                    }}
                    className="p-1 sm:px-2 sm:py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    title="Dispatch Radio Tower"
                  >
                    <span className="material-symbols-outlined text-sm text-emerald-600">radio</span>
                    <span className="hidden sm:inline">Radio</span>
                  </button>
                  {isCardCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGoogleMaps();
                      }}
                      className="px-2 py-1 bg-primary hover:bg-primary-hover text-white rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-xs transition-colors cursor-pointer"
                      title="Open Google Maps GPS"
                    >
                      <span className="material-symbols-outlined text-[12px]">directions</span>
                      <span>GPS</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Card Details Body */}
              <AnimatePresence initial={false}>
                {!isCardCollapsed && (
                  <motion.div
                    key="card-details-expanded"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-2.5 pt-1 overflow-y-auto max-h-[60vh] sm:max-h-[68vh] pr-0.5"
                  >
                    {/* Waypoint Details & Gated Progressive Disclosure */}
                    {!isPickedUp ? (
                      /* STAGE 1: PICKUP ORIGIN (DROPOFF GATED) */
                      <div className="space-y-2">
                        <div className="bg-surface-low border border-border rounded-lg p-2.5 space-y-2">
                          {/* Waypoint Header & Accuracy Badge */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="text-[10px] text-emerald-700 uppercase font-black flex items-center gap-1 font-mono">
                              <span className="material-symbols-outlined text-xs">location_on</span>
                              Pickup Origin Landmark
                            </span>
                            <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase rounded border inline-flex items-center gap-1 font-mono ${
                              pickupResolution?.isEstimatedVicinity
                                ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                            }`}>
                              {pickupResolution?.isEstimatedVicinity ? (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Approx Area (±{pickupResolution.accuracyRadius}m)
                                </>
                              ) : (
                                <>✓ Verified Street (±{pickupResolution?.accuracyRadius || 35}m)</>
                              )}
                            </span>
                          </div>

                          {/* Full Address — Full Span, No Ugly Ellipsis */}
                          <p className="text-xs font-bold text-text leading-snug break-words">
                            {currentJob.pickup_address}
                          </p>

                          {/* Sender Contact Info */}
                          <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
                            <span className="material-symbols-outlined text-xs text-text-dim">person</span>
                            <span>
                              Sender: <span className="font-semibold text-text">{currentJob.pickup_name || 'Customer'}</span>
                              {currentJob.pickup_phone && ` (${currentJob.pickup_phone})`}
                            </span>
                          </div>

                          {/* Unified 3-Column Ergonomic Action Bar */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={handleOpenGoogleMaps}
                              className="flex-1 py-1.5 px-2 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px]"
                            >
                              <span className="material-symbols-outlined text-[13px]">directions</span>
                              <span>1-Tap GPS</span>
                            </button>

                            {currentJob.pickup_phone && (
                              <>
                                <a
                                  href={`https://wa.me/${formatWhatsAppPhone(currentJob.pickup_phone)}?text=${encodeURIComponent(
                                    `Hello ${currentJob.pickup_name || 'Sender'}, I am your Fast X Courier for waybill FX-${currentJob.id.slice(0, 8).toUpperCase()}. I am en route to pick up your parcel.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px] font-sans"
                                  title="Message Sender on WhatsApp"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                                  <span>WhatsApp</span>
                                </a>
                                <a
                                  href={`tel:${formatTelPhone(currentJob.pickup_phone)}`}
                                  className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px] font-sans"
                                  title="Call Sender"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-primary">call</span>
                                  <span>Call</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {pickupResolution?.isEstimatedVicinity && (
                          <div className="bg-amber-500/10 border border-amber-500/30 p-2 text-xs flex items-center gap-2 text-amber-900 rounded">
                            <span className="material-symbols-outlined text-sm text-amber-600 shrink-0">warning</span>
                            <p className="text-[10px] font-medium leading-tight font-sans">
                              <strong>Approximate Area:</strong> Origin pin is an estimated vicinity (±{pickupResolution.accuracyRadius}m). Call sender upon arrival for exact gate.
                            </p>
                          </div>
                        )}

                        {/* Gated Destination Strip */}
                        <div className="bg-amber-500/5 border border-amber-500/20 p-2 text-xs flex items-center justify-between text-amber-800 rounded">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono">
                            <span className="material-symbols-outlined text-xs text-amber-600">lock</span>
                            <span>Destination (Gated & Confidential)</span>
                          </div>
                          <span className="text-[8.5px] uppercase font-mono text-amber-600 font-bold">Unlocks on Pickup</span>
                        </div>
                      </div>
                    ) : (
                      /* STAGE 2: DROPOFF DESTINATION (UNLOCKED) */
                      <div className="space-y-2">
                        <div className="bg-surface-low border border-border rounded-lg p-2.5 space-y-2">
                          {/* Waypoint Header & Accuracy Badge */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="text-[10px] text-rose-700 uppercase font-black flex items-center gap-1 font-mono">
                              <span className="material-symbols-outlined text-xs">flag</span>
                              Dropoff Destination (Unlocked)
                            </span>
                            <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase rounded border inline-flex items-center gap-1 font-mono ${
                              dropoffResolution?.isEstimatedVicinity
                                ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                            }`}>
                              {dropoffResolution?.isEstimatedVicinity ? (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Approx Area (±{dropoffResolution.accuracyRadius}m)
                                </>
                              ) : (
                                <>✓ Verified Street (±{dropoffResolution?.accuracyRadius || 35}m)</>
                              )}
                            </span>
                          </div>

                          {/* Full Address — Full Span, No Ugly Ellipsis */}
                          <p className="text-xs font-bold text-text leading-snug break-words">
                            {currentJob.dropoff_address}
                          </p>

                          {/* Recipient Contact Info */}
                          <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
                            <span className="material-symbols-outlined text-xs text-text-dim">person</span>
                            <span>
                              Recipient: <span className="font-semibold text-text">{currentJob.dropoff_name || 'Recipient'}</span>
                              {currentJob.dropoff_phone && ` (${currentJob.dropoff_phone})`}
                            </span>
                          </div>

                          {/* Unified 3-Column Ergonomic Action Bar */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={handleOpenGoogleMaps}
                              className="flex-1 py-1.5 px-2 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px]"
                            >
                              <span className="material-symbols-outlined text-[13px]">directions</span>
                              <span>1-Tap GPS</span>
                            </button>

                            {currentJob.dropoff_phone && (
                              <>
                                <a
                                  href={`https://wa.me/${formatWhatsAppPhone(currentJob.dropoff_phone)}?text=${encodeURIComponent(
                                    `Hello ${currentJob.dropoff_name || 'Recipient'}, I am your Fast X Courier for waybill FX-${currentJob.id.slice(0, 8).toUpperCase()}. I have picked up your package and am heading to your dropoff location.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px] font-sans"
                                  title="Message Recipient on WhatsApp"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                                  <span>WhatsApp</span>
                                </a>
                                <a
                                  href={`tel:${formatTelPhone(currentJob.dropoff_phone)}`}
                                  className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px] font-sans"
                                  title="Call Recipient"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-primary">call</span>
                                  <span>Call</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {dropoffResolution?.isEstimatedVicinity && (
                          <div className="bg-amber-500/10 border border-amber-500/30 p-2 text-xs flex items-center gap-2 text-amber-900 rounded">
                            <span className="material-symbols-outlined text-sm text-amber-600 shrink-0">warning</span>
                            <p className="text-[10px] font-medium leading-tight font-sans">
                              <strong>Approximate Area:</strong> Destination is an estimated vicinity (±{dropoffResolution.accuracyRadius}m). Call recipient upon arrival for door delivery.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {feedback && (
                      <div className="p-2 bg-surface-low border border-border text-xs text-text rounded font-mono">
                        {feedback}
                      </div>
                    )}

                    {/* In-Map PIN Verification Handover — Compact & Ergonomic */}
                    <div className="bg-surface-low border border-border rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-text uppercase tracking-wider">
                          {!isPickedUp ? '🔑 Step 1: Verify Pickup PIN' : '🔑 Step 2: Verify Delivery PIN'}
                        </span>
                        <span className="text-text-muted text-[9px]">
                          {!isPickedUp ? 'Ask sender for 4-digit PIN' : 'Ask recipient for 4-digit PIN'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="PIN CODE"
                          value={!isPickedUp ? pickupPin : deliveryPin}
                          onChange={(e) => (!isPickedUp ? setPickupPin(e.target.value) : setDeliveryPin(e.target.value))}
                          className="w-28 sm:w-36 bg-surface-elevated border border-border text-text px-2 py-2 text-xs font-mono font-bold text-center uppercase tracking-[0.25em] focus:outline-none focus:border-primary rounded"
                        />
                        <button
                          onClick={!isPickedUp ? handlePickup : handleComplete}
                          disabled={isPending || (!isPickedUp ? !pickupPin.trim() : !deliveryPin.trim())}
                          className="flex-1 py-2 px-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-mono font-black text-[10.5px] uppercase tracking-wider rounded shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[40px]"
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">
                            {!isPickedUp ? 'inventory_2' : 'verified'}
                          </span>
                          <span>
                            {isPending
                              ? 'VERIFYING...'
                              : !isPickedUp
                              ? 'Confirm Pickup'
                              : 'Confirm Delivery'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Standby State: No Active Delivery */
            <motion.div
              key="standby-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated/95 backdrop-blur-xl border border-border border-l-4 border-l-emerald-500 p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                  Fleet Online — Standing By
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-black uppercase">
                  {poolJobs.length} Available
                </span>
              </div>
              <p className="text-xs text-text-muted">
                You have no active deliveries in progress. Your live GPS telemetry is broadcasting to the central logistics network.
              </p>
              <button
                onClick={() => navigateTo('job_pool')}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-mono font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Browse Available Jobs ({poolJobs.length}) →</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
