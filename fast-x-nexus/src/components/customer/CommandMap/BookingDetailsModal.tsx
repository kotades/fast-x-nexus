'use client';

/**
 * /src/components/customer/CommandMap/BookingDetailsModal.tsx
 * Fast X Nexus — Streamlined On-Screen Booking Details Modal
 *
 * Screen-sized modal overlay on the dashboard displaying essential booking data:
 * - Waybill ID & status
 * - Assigned rider details (name, vehicle, direct contact, live distance & approx time)
 *   or clean "Pending" badge when awaiting assignment
 * - Addresses with verified street badges, contact names & phone numbers
 * - Handover PINs (POP & POD)
 * - Package specs & total fare
 *
 * Excludes redundant command map, repetitive scanning banners, and internal fee breakdowns.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrderDetails, type FullOrderDetails } from '@/app/actions/order';
import { deriveDualPins } from '@/lib/dispatch/pins';
import { createBrowserClient } from '@/lib/supabase/client';
import { resolveAddressCascading, isWithinNigeria } from '@/lib/geo/cascadingGeocoder';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  riderCoords?: { lat: number; lng: number } | null;
}

// Great-circle haversine distance
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Estimated driving time in Lagos traffic (avg 25 km/h)
function estimateDrivingMinutes(distanceKm: number): number {
  return Math.max(2, Math.round((distanceKm / 25) * 60));
}

export function BookingDetailsModal({
  isOpen,
  onClose,
  orderId,
  riderCoords: initialRiderCoords,
}: BookingDetailsModalProps) {
  const [order, setOrder] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ lat: number; lng: number } | null>(
    initialRiderCoords || null
  );

  const [resolvedPickup, setResolvedPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedDropoff, setResolvedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupResolution, setPickupResolution] = useState<any>(null);
  const [dropoffResolution, setDropoffResolution] = useState<any>(null);

  const supabase = createBrowserClient();

  // 1. Fetch Order Details on Open
  useEffect(() => {
    if (!isOpen || !orderId) {
      setOrder(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function fetchDetails() {
      try {
        const res = await getOrderDetails(orderId as string);
        if (res.success && isMounted) {
          setOrder(res.data);
          if (res.data.rider?.coords) {
            setLiveRiderCoords(res.data.rider.coords);
          }
        }
      } catch (err) {
        console.error('[BookingDetailsModal] Error fetching order:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId]);

  // 2. Geocode Addresses for Verified Badges & Coordinates
  useEffect(() => {
    if (!order) return;

    async function geocode() {
      if (order?.pickupAddress) {
        const pRes = await resolveAddressCascading(order.pickupAddress);
        if (pRes && isWithinNigeria(pRes.lat, pRes.lng)) {
          setResolvedPickup({ lat: pRes.lat, lng: pRes.lng });
          setPickupResolution(pRes);
        }
      }

      if (order?.dropoffAddress) {
        const dRes = await resolveAddressCascading(order.dropoffAddress);
        if (dRes && isWithinNigeria(dRes.lat, dRes.lng)) {
          setResolvedDropoff({ lat: dRes.lat, lng: dRes.lng });
          setDropoffResolution(dRes);
        }
      }
    }

    geocode();
  }, [order?.pickupAddress, order?.dropoffAddress]);

  // 3. Realtime Updates on the Order (Rider assignment & status transitions)
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const channel = supabase
      .channel(`modal-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        async () => {
          const res = await getOrderDetails(orderId);
          if (res.success) {
            setOrder(res.data);
            if (res.data.rider?.coords) {
              setLiveRiderCoords(res.data.rider.coords);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, orderId, supabase]);

  // 4. Realtime Updates on Rider Location
  useEffect(() => {
    const riderId = order?.rider?.id;
    if (!isOpen || !riderId) return;

    const channel = supabase
      .channel(`modal-rider-loc-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const newLoc = payload.new as any;
          if (newLoc && newLoc.latitude && newLoc.longitude) {
            setLiveRiderCoords({ lat: Number(newLoc.latitude), lng: Number(newLoc.longitude) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, order?.rider?.id, supabase]);

  // 5. Proximity Calculation (Distance & Approx Time)
  const proximity = useMemo(() => {
    if (!order || !order.rider) return null;

    const isPickedUp = order.status === 'PICKED_UP';
    const targetCoords = isPickedUp ? resolvedDropoff : resolvedPickup;
    const targetLabel = isPickedUp ? 'Dropoff' : 'Pickup';

    if (!liveRiderCoords || !targetCoords) return null;

    const distanceKm = calculateDistanceKm(
      liveRiderCoords.lat,
      liveRiderCoords.lng,
      targetCoords.lat,
      targetCoords.lng
    );
    const etaMinutes = estimateDrivingMinutes(distanceKm);

    return {
      distanceKm,
      etaMinutes,
      isPickedUp,
      targetLabel,
    };
  }, [order, liveRiderCoords, resolvedPickup, resolvedDropoff]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/25 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-surface-elevated border border-border border-l-4 border-l-primary max-w-xl w-full max-h-[90vh] shadow-2xl font-mono text-text flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-surface-low flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  WAYBILL DETAILS
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-text">
                    {order?.trackingCode || (orderId ? `FX-${orderId.slice(0, 8).toUpperCase()}` : 'LOADING...')}
                  </h2>
                  {order && (
                    <button
                      onClick={() => copyToClipboard(order.trackingCode, 'waybill')}
                      className="p-1 hover:bg-surface border border-transparent hover:border-border text-text-muted hover:text-text transition-colors"
                      title="Copy Waybill Code"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedField === 'waybill' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {order && (
                  <span
                    className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                      order.rider
                        ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                    }`}
                  >
                    {order.rider ? (order.status === 'PICKED_UP' ? 'In Transit' : 'Assigned') : 'Pending'}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-surface-dim text-text-muted hover:text-text transition-colors cursor-pointer"
                  title="Close Details"
                >
                  <span className="material-symbols-outlined text-lg leading-none">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {loading && !order ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
                  <span className="material-symbols-outlined text-2xl text-primary animate-spin">sync</span>
                  <span className="text-xs uppercase font-bold">Loading Waybill Data...</span>
                </div>
              ) : order ? (
                <>
                  {/* 1. Assigned Rider Details (or Clean Pending Status) */}
                  {order.rider ? (
                    <div className="p-3 bg-surface-low border border-border border-l-4 border-l-emerald-600 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                            <span className="material-symbols-outlined text-base">two_wheeler</span>
                          </div>
                          <div>
                            <p className="text-[9px] text-emerald-700 uppercase font-black tracking-wide">
                              Assigned Courier
                            </p>
                            <p className="text-xs font-black text-text">{order.rider.name}</p>
                            <p className="text-[10px] text-text-muted">
                              {order.rider.vehicleType} • {order.rider.vehiclePlate}
                            </p>
                          </div>
                        </div>

                        {/* Direct Contact Actions */}
                        <div className="flex items-center gap-1.5">
                          {order.rider.phone && (
                            <a
                              href={`https://wa.me/${order.rider.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] text-[10px] font-bold uppercase flex items-center gap-1 transition-colors"
                              title="Message Courier"
                            >
                              <span className="material-symbols-outlined text-xs">chat</span>
                              <span>WhatsApp</span>
                            </a>
                          )}
                          {order.rider.phone && (
                            <a
                              href={`tel:${order.rider.phone}`}
                              className="p-1 bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[10px] font-bold flex items-center justify-center transition-colors"
                              title="Call Courier"
                            >
                              <span className="material-symbols-outlined text-xs">call</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Distance & Approx Time Proximity Banner */}
                      {proximity ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase">
                              Distance to {proximity.targetLabel}:
                            </span>
                          </div>
                          <span className="font-black text-emerald-950 text-xs">
                            {proximity.distanceKm} km (~{proximity.etaMinutes} mins)
                          </span>
                        </div>
                      ) : (
                        <div className="bg-surface border border-border p-1.5 text-[9px] text-text-muted flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-primary animate-spin">sync</span>
                          <span>Syncing courier live location...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Pending Courier Status */
                    <div className="p-3 bg-surface-low border border-border flex items-center justify-between text-xs">
                      <span className="text-text-muted flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-500 animate-spin">sync</span>
                        Assigned Courier
                      </span>
                      <span className="font-bold text-amber-700 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] uppercase tracking-wider">
                        Pending Assignment
                      </span>
                    </div>
                  )}

                  {/* 2. Routing Addresses */}
                  <div className="space-y-2">
                    {/* Origin / Pickup */}
                    <div className="bg-surface-low border border-border p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-black text-emerald-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">radio_button_checked</span>
                          Origin Pickup
                        </span>
                        {pickupResolution?.isEstimatedVicinity ? (
                          <span className="text-[8px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1 py-0.2 uppercase">
                            Approx Area (±{pickupResolution?.accuracyRadius || 180}m)
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1 py-0.2 uppercase">
                            ✓ Verified Street (±{pickupResolution?.accuracyRadius || 45}m)
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-text text-xs">{order.pickupAddress}</p>
                      <p className="text-[10px] text-text-muted">
                        Sender: {order.pickupName} ({order.pickupPhone})
                      </p>
                    </div>

                    {/* Destination / Dropoff */}
                    <div className="bg-surface-low border border-border p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-black text-red-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">location_on</span>
                          Destination Dropoff
                        </span>
                        {dropoffResolution?.isEstimatedVicinity ? (
                          <span className="text-[8px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1 py-0.2 uppercase">
                            Approx Area (±{dropoffResolution?.accuracyRadius || 180}m)
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1 py-0.2 uppercase">
                            ✓ Verified Street (±{dropoffResolution?.accuracyRadius || 45}m)
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-text text-xs">{order.dropoffAddress}</p>
                      <p className="text-[10px] text-text-muted">
                        Recipient: {order.dropoffName} ({order.dropoffPhone})
                      </p>
                    </div>
                  </div>

                  {/* 3. Handover PINs (Unmasked for physical chain-of-custody handoff) */}
                  {(() => {
                    const derived = deriveDualPins(order.id, order.metadata);
                    const effectivePickupPin = (order.pickupPin && order.pickupPin !== '••••') ? order.pickupPin : derived.pickupPin;
                    const effectiveDeliveryPin = (order.deliveryPin && order.deliveryPin !== '••••') ? order.deliveryPin : derived.deliveryPin;

                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Stage 1: Pickup POP PIN */}
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black text-amber-800">
                              Pickup PIN (POP)
                            </span>
                            <button
                              onClick={() => copyToClipboard(effectivePickupPin, 'pop')}
                              className="text-[9px] text-amber-800 hover:text-amber-950 font-bold uppercase cursor-pointer"
                            >
                              {copiedField === 'pop' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <div className="text-2xl font-black font-mono text-amber-900 tracking-widest">
                            {effectivePickupPin}
                          </div>
                          <p className="text-[8.5px] text-amber-900/80 leading-tight">
                            Share with courier at pickup
                          </p>
                        </div>

                        {/* Stage 2: Delivery POD PIN */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-black text-emerald-800">
                              Delivery PIN (POD)
                            </span>
                            <button
                              onClick={() => copyToClipboard(effectiveDeliveryPin, 'pod')}
                              className="text-[9px] text-emerald-800 hover:text-emerald-950 font-bold uppercase cursor-pointer"
                            >
                              {copiedField === 'pod' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <div className="text-2xl font-black font-mono text-emerald-900 tracking-widest">
                            {effectiveDeliveryPin}
                          </div>
                          <p className="text-[8.5px] text-emerald-900/80 leading-tight">
                            Share upon parcel delivery
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Package Specs & Fare */}
                  <div className="bg-surface-low border border-border p-2.5 text-xs grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Cargo</span>
                      <span className="font-bold text-text truncate block">{order.parcel?.description || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Weight</span>
                      <span className="font-bold text-text">{order.parcel?.weight || 5} kg</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Total Fare</span>
                      <span className="font-black text-emerald-600">₦{order.totalAmount.toLocaleString('en-NG')}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
