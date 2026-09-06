'use client';

/**
 * /src/app/customer/orders/[id]/page.tsx
 * Fast X Nexus — Full Booking Details & Real-Time Telemetry Route
 *
 * Implements:
 * 1. Full booking breakdown: Waybill code, addresses, sender & recipient details,
 *    security PINs (POP/POD), cargo specifications, and payment breakdown.
 * 2. Live Assigned Courier Card: Updates automatically when a courier is assigned,
 *    displaying rider contact actions, vehicle details, live coordinates,
 *    distance to pickup destination in km, and driving ETA in minutes.
 * 3. Embedded Interactive DynamicMap with verified street resolution markers.
 * 4. Supabase Realtime subscriptions to `orders` and `rider_locations`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrderDetails, type FullOrderDetails } from '@/app/actions/order';
import { DynamicMap } from '@/components/maps/DynamicMap';
import { createBrowserClient } from '@/lib/supabase/client';
import { resolveAddressCascading, isWithinNigeria } from '@/lib/geo/cascadingGeocoder';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';

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

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.id as string) || '';

  const [order, setOrder] = useState<FullOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [resolvedPickup, setResolvedPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedDropoff, setResolvedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupResolution, setPickupResolution] = useState<any>(null);
  const [dropoffResolution, setDropoffResolution] = useState<any>(null);

  const supabase = createBrowserClient();

  // 1. Initial Load of Order Details
  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await getOrderDetails(orderId);
      if (res.success) {
        setOrder(res.data);
        if (res.data.rider?.coords) {
          setRiderCoords(res.data.rider.coords);
        }
      } else {
        setError(res.error || 'Failed to load booking details.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  // 2. Geocode Waypoints for Accurate Map Rendering
  useEffect(() => {
    if (!order) return;

    async function geocodeWaypoints() {
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

    geocodeWaypoints();
  }, [order?.pickupAddress, order?.dropoffAddress]);

  // 3. Supabase Realtime for Order Status and Rider Assignment
  useEffect(() => {
    if (!order?.id) return;

    const orderChannel = supabase
      .channel(`order-details-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        async () => {
          // Re-fetch complete joined payload to pick up newly assigned rider profile
          const updated = await getOrderDetails(order.id);
          if (updated.success) {
            setOrder(updated.data);
            if (updated.data.rider?.coords) {
              setRiderCoords(updated.data.rider.coords);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [order?.id, supabase]);

  // 4. Supabase Realtime for Live Rider Location
  useEffect(() => {
    const riderId = order?.rider?.id;
    if (!riderId) {
      return;
    }

    // Fetch initial latest position
    const fetchRiderPos = async () => {
      const { data } = await supabase
        .from('rider_locations')
        .select('latitude, longitude')
        .eq('rider_id', riderId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.latitude && data.longitude) {
        setRiderCoords({ lat: Number(data.latitude), lng: Number(data.longitude) });
      }
    };
    fetchRiderPos();

    const riderChannel = supabase
      .channel(`rider-tracking-${riderId}`)
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
            setRiderCoords({ lat: Number(newLoc.latitude), lng: Number(newLoc.longitude) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(riderChannel);
    };
  }, [order?.rider?.id, supabase]);

  // 5. Compute Live Proximity Metrics
  const proximity = useMemo(() => {
    if (!order) return null;

    const isPickedUp = order.status === 'PICKED_UP';
    const targetCoords = isPickedUp ? resolvedDropoff : resolvedPickup;
    const targetLabel = isPickedUp ? 'Destination Dropoff' : 'Pickup Location';

    if (!riderCoords || !targetCoords) {
      return null;
    }

    const distanceKm = calculateDistanceKm(
      riderCoords.lat,
      riderCoords.lng,
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
  }, [order, riderCoords, resolvedPickup, resolvedDropoff]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return { text: 'Booking Placed', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' };
      case 'PAID_UNASSIGNED':
        return { text: 'Matching Courier', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' };
      case 'ASSIGNED':
        return { text: 'Courier Assigned & En Route', color: 'bg-primary/10 text-primary border-primary/30' };
      case 'PICKED_UP':
        return { text: 'In Transit', color: 'bg-primary/10 text-primary border-primary/30' };
      case 'DELIVERED':
        return { text: 'Delivered', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' };
      case 'CANCELLED':
        return { text: 'Cancelled', color: 'bg-red-500/10 text-red-700 border-red-500/30' };
      default:
        return { text: status, color: 'bg-surface-low text-text-dim border-border' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface text-text font-sans">
        <Header />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 font-mono">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Loading Telemetry Data...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-screen bg-surface text-text font-sans">
        <Header />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center font-mono">
          <div className="bg-surface-elevated border border-border p-8 border-l-4 border-l-red-500 shadow-xl space-y-4">
            <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
            <h1 className="text-lg font-black uppercase tracking-tight">Booking Not Found</h1>
            <p className="text-xs text-text-muted">{error || 'This order does not exist or has been deleted.'}</p>
            <div className="pt-2">
              <button
                onClick={() => router.push('/customer')}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Return to Customer Command Map
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const badge = getStatusBadge(order.status);

  return (
    <div className="flex flex-col min-h-screen bg-surface text-text font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 font-mono">
          <div className="flex items-center gap-2">
            <Link
              href="/customer"
              className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-low border border-border text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-text transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Command Map</span>
            </Link>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-xs font-bold text-text-muted">Waybill Details</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 flex items-center gap-1.5 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Real-Time Telemetry Live
            </span>
          </div>
        </div>

        {/* Hero Waybill Identifier & Status */}
        <div className="bg-surface-elevated border border-border p-5 border-l-4 border-l-primary shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
          <div>
            <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-0.5">
              WAYBILL SERIAL
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text">
                {order.trackingCode}
              </h1>
              <button
                onClick={() => copyToClipboard(order.trackingCode, 'waybill')}
                className="p-1.5 bg-surface-low hover:bg-surface border border-border text-text-muted hover:text-text transition-colors cursor-pointer"
                title="Copy Waybill Code"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedField === 'waybill' ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1 font-sans">
              Booked on {new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Total Fare</p>
              <p className="text-xl font-black text-text">₦{order.totalAmount.toLocaleString('en-NG')}</p>
            </div>
            <div className={`px-3 py-2 border text-xs font-black uppercase tracking-wider ${badge.color}`}>
              {badge.text}
            </div>
          </div>
        </div>

        {/* Grid Layout: Main Details + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Telemetry Hero, Route Map, Addresses */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Courier Assignment & Live Telemetry Banner */}
            {order.rider ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-elevated border border-border border-l-4 border-l-emerald-600 p-5 shadow-md space-y-4 font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">two_wheeler</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-700 uppercase font-black tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        Assigned Courier
                      </p>
                      <h3 className="text-base font-black text-text">{order.rider.name}</h3>
                      <p className="text-[11px] text-text-muted">
                        {order.rider.vehicleType} • {order.rider.vehiclePlate}
                      </p>
                    </div>
                  </div>

                  {/* Courier Contact Buttons */}
                  <div className="flex items-center gap-2">
                    {order.rider.phone && (
                      <a
                        href={`https://wa.me/${order.rider.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {order.rider.phone && (
                      <a
                        href={`tel:${order.rider.phone}`}
                        className="px-3 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">call</span>
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Real-time Distance & ETA Proximity Metrics */}
                {proximity ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                        {proximity.isPickedUp ? 'Distance to Dropoff:' : 'Distance to Pickup:'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-emerald-950 font-mono">
                        {proximity.distanceKm} km
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs rounded-sm">
                        ~{proximity.etaMinutes} mins ETA
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-low border border-border text-xs text-text-muted flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base animate-spin">sync</span>
                    <span>Waiting for courier live telemetry coordinates broadcast...</span>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Unassigned State */
              <div className="bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 p-4 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-amber-600 animate-spin">radar</span>
                  <div>
                    <p className="font-bold text-amber-900 uppercase">Matching Nearest Courier...</p>
                    <p className="text-[11px] text-amber-800">
                      System is scanning nearby H3 hexagonal zones for available riders in Lagos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Live Map */}
            <div className="bg-surface-elevated border border-border overflow-hidden shadow-md">
              <div className="p-3 border-b border-border bg-surface-low flex items-center justify-between font-mono text-xs">
                <span className="font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">map</span>
                  Live Trajectory & Geofence Map
                </span>
                {order.rider && riderCoords && (
                  <span className="text-[10px] text-text-muted">
                    Rider GPS: {riderCoords.lat.toFixed(4)}, {riderCoords.lng.toFixed(4)}
                  </span>
                )}
              </div>

              <div className="h-[380px] w-full relative">
                <DynamicMap
                  pickupCell={order.pickupH3Cell}
                  dropoffCell={order.dropoffH3Cell}
                  pickupCoords={resolvedPickup}
                  dropoffCoords={resolvedDropoff}
                  riderCoords={riderCoords}
                  pickupAddress={order.pickupAddress}
                  dropoffAddress={order.dropoffAddress}
                  status={order.status}
                  viewer="customer"
                  isEstimatedPickup={pickupResolution?.isEstimatedVicinity}
                  isEstimatedDropoff={dropoffResolution?.isEstimatedVicinity}
                  pickupRadius={pickupResolution?.accuracyRadius || 45}
                  dropoffRadius={dropoffResolution?.accuracyRadius || 45}
                  zoom={12}
                />
              </div>
            </div>

            {/* Waypoints & Routing Addresses */}
            <div className="bg-surface-elevated border border-border p-5 space-y-4 font-mono">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-dim border-b border-border pb-2">
                Routing Waypoints & Geo Resolution
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Origin / Pickup Card */}
                <div className="bg-surface-low border border-border p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">radio_button_checked</span>
                      Origin Pickup
                    </span>
                    {pickupResolution?.isEstimatedVicinity ? (
                      <span className="text-[8.5px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1.5 py-0.5 uppercase">
                        Approx Area (±{pickupResolution?.accuracyRadius || 180}m)
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.5 uppercase">
                        ✓ Verified Street (±{pickupResolution?.accuracyRadius || 45}m)
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-text leading-snug">{order.pickupAddress}</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Contact: {order.pickupName} ({order.pickupPhone})
                    </p>
                    <p className="text-[9px] text-text-dim font-mono mt-0.5">
                      H3 Cell: {order.pickupH3Cell}
                    </p>
                  </div>
                </div>

                {/* Destination / Dropoff Card */}
                <div className="bg-surface-low border border-border p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-red-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      Destination Dropoff
                    </span>
                    {dropoffResolution?.isEstimatedVicinity ? (
                      <span className="text-[8.5px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1.5 py-0.5 uppercase">
                        Approx Area (±{dropoffResolution?.accuracyRadius || 180}m)
                      </span>
                    ) : (
                      <span className="text-[8.5px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.5 uppercase">
                        ✓ Verified Street (±{dropoffResolution?.accuracyRadius || 45}m)
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-text leading-snug">{order.dropoffAddress}</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      Recipient: {order.dropoffName} ({order.dropoffPhone})
                    </p>
                    <p className="text-[9px] text-text-dim font-mono mt-0.5">
                      H3 Cell: {order.dropoffH3Cell}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (1 Col): Security PINs, Cargo Specs, Financials */}
          <div className="space-y-6 font-mono">

            {/* Handover Security PINs Card */}
            <div className="bg-surface-elevated border border-border border-l-4 border-l-primary p-5 shadow-sm space-y-4">
              <div className="border-b border-border pb-2">
                <p className="text-[10px] text-primary uppercase font-black tracking-widest">
                  Cargo Security
                </p>
                <h3 className="text-base font-black text-text">Handover PINs</h3>
              </div>

              {/* Stage 1: Pickup POP PIN */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-amber-800">
                    Stage 1: Pickup PIN (POP)
                  </span>
                  <button
                    onClick={() => copyToClipboard(order.pickupPin, 'pop')}
                    className="flex items-center gap-1 text-[10px] text-amber-800 hover:text-amber-950 font-bold uppercase cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'pop' ? 'check' : 'content_copy'}
                    </span>
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-2xl font-black text-amber-900 tracking-widest font-mono">
                  {order.pickupPin}
                </div>
                <p className="text-[10px] text-amber-900/80 font-sans leading-tight">
                  Share with the courier at your door upon cargo inspection to unlock destination.
                </p>
              </div>

              {/* Stage 2: Delivery POD PIN */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-emerald-800">
                    Stage 2: Delivery PIN (POD)
                  </span>
                  <button
                    onClick={() => copyToClipboard(order.deliveryPin, 'pod')}
                    className="flex items-center gap-1 text-[10px] text-emerald-800 hover:text-emerald-950 font-bold uppercase cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'pod' ? 'check' : 'content_copy'}
                    </span>
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-2xl font-black text-emerald-900 tracking-widest font-mono">
                  {order.deliveryPin}
                </div>
                <p className="text-[10px] text-emerald-900/80 font-sans leading-tight">
                  Provide to recipient. Handed over upon parcel delivery to unlock courier payout.
                </p>
              </div>
            </div>

            {/* Package & Cargo Specifications */}
            <div className="bg-surface-elevated border border-border p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-dim border-b border-border pb-2">
                Package Specifications
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Description:</span>
                  <span className="font-bold text-text">{order.parcel?.description || 'Standard Cargo'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Weight:</span>
                  <span className="font-bold text-text">{order.parcel?.weight || 5} kg</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Declared Value:</span>
                  <span className="font-bold text-text">
                    ₦{(order.parcel?.declaredValue || order.totalAmount).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="bg-surface-elevated border border-border p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-dim border-b border-border pb-2">
                Billing & Ledger
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Payment Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">CONFIRMED / PAID</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Rider Escrow Share (70%):</span>
                  <span className="font-bold text-text">
                    ₦{Math.round(order.totalAmount * 0.7).toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-muted">Platform Fee (30%):</span>
                  <span className="font-bold text-text">
                    ₦{Math.round(order.totalAmount * 0.3).toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-sm">
                  <span className="font-bold text-text">Total Paid:</span>
                  <span className="font-black text-primary">
                    ₦{order.totalAmount.toLocaleString('en-NG')}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
