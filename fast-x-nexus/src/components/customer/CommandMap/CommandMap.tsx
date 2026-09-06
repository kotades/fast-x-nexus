'use client';

/**
 * /src/components/customer/CommandMap/CommandMap.tsx
 * Fast X Nexus — Main Command Map Orchestrator
 *
 * Full-height map canvas with hex-pattern bg, Leaflet base layer.
 * Wired directly to Supabase Realtime for Rider locations and H3 bounds.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { ActiveShipmentCard } from './ActiveShipmentCard';
import { EmptyState } from '@/components/customer/shared/EmptyState';
import { DynamicMap } from '@/components/maps/DynamicMap';
import { BookingDetailsModal } from './BookingDetailsModal';
import { createBrowserClient } from '@/lib/supabase/client';
import { resolveAddressCascading, isWithinNigeria } from '@/lib/geo/cascadingGeocoder';

export function CommandMap() {
  const router = useRouter();
  const { activeShipment, navigateTo, activeDeliveriesCount } = useCustomerDashboard();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedPickup, setResolvedPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedDropoff, setResolvedDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupAccuracyRadius, setPickupAccuracyRadius] = useState<number>(180);
  const [dropoffAccuracyRadius, setDropoffAccuracyRadius] = useState<number>(180);
  const [isEstimatedPickup, setIsEstimatedPickup] = useState<boolean>(false);
  const [isEstimatedDropoff, setIsEstimatedDropoff] = useState<boolean>(false);
  const [pickupResolution, setPickupResolution] = useState<any>(null);
  const [dropoffResolution, setDropoffResolution] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    showRiders: true,
    showHubs: false,
    showPickups: true,
  });
  const filterRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Resolve Nigerian Coordinates for current active shipment waypoints
  useEffect(() => {
    async function geocodeShipmentWaypoints() {
      if (!activeShipment) {
        setResolvedPickup(null);
        setResolvedDropoff(null);
        setPickupResolution(null);
        setDropoffResolution(null);
        return;
      }

      if (activeShipment.origin) {
        const pRes = await resolveAddressCascading(activeShipment.origin);
        if (pRes && isWithinNigeria(pRes.lat, pRes.lng)) {
          setResolvedPickup({ lat: pRes.lat, lng: pRes.lng });
          setPickupAccuracyRadius(pRes.accuracyRadius || 180);
          setIsEstimatedPickup(Boolean(pRes.isEstimatedVicinity));
          setPickupResolution(pRes);
        }
      }

      if (activeShipment.destination) {
        const dRes = await resolveAddressCascading(activeShipment.destination);
        if (dRes && isWithinNigeria(dRes.lat, dRes.lng)) {
          setResolvedDropoff({ lat: dRes.lat, lng: dRes.lng });
          setDropoffAccuracyRadius(dRes.accuracyRadius || 180);
          setIsEstimatedDropoff(Boolean(dRes.isEstimatedVicinity));
          setDropoffResolution(dRes);
        }
      }
    }

    geocodeShipmentWaypoints();
  }, [activeShipment?.origin, activeShipment?.destination]);

  // Close filter on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to Rider Location if a rider is assigned
  useEffect(() => {
    if (!activeShipment?.riderId) {
      setRiderCoords(null);
      return;
    }

    let isMounted = true;

    const fetchInitialLocation = async () => {
      const { data } = await supabase
        .from('rider_locations')
        .select('latitude, longitude')
        .eq('rider_id', activeShipment.riderId)
        .single();

      if (data && isMounted) {
        setRiderCoords({ lat: Number(data.latitude), lng: Number(data.longitude) });
      }
    };
    fetchInitialLocation();

    const channel = supabase
      .channel(`rider-loc-${activeShipment.riderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations',
          filter: `rider_id=eq.${activeShipment.riderId}`,
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
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeShipment?.riderId, supabase]);

  // Determine active count (at least 1 if activeShipment exists)
  const displayActiveCount = Math.max(activeDeliveriesCount, activeShipment ? 1 : 0);

  return (
    <div className="relative w-full h-full flex-1 min-h-[450px] overflow-hidden bg-[#f8fafc]">
      {/* Background Interactive Map */}
      <DynamicMap
        pickupCell={activeShipment?.pickupH3Cell}
        dropoffCell={activeShipment?.dropoffH3Cell}
        pickupCoords={resolvedPickup}
        dropoffCoords={resolvedDropoff}
        riderCoords={riderCoords}
        pickupAddress={activeShipment?.origin}
        dropoffAddress={activeShipment?.destination}
        status={activeShipment?.status}
        viewer="customer"
        pickupRadius={pickupAccuracyRadius}
        dropoffRadius={dropoffAccuracyRadius}
        isEstimatedVicinity={isEstimatedPickup}
        isEstimatedPickup={isEstimatedPickup}
        isEstimatedDropoff={isEstimatedDropoff}
        filters={filters}
      />

      {/* Top Floating Control Bar — Single Line on Mobile */}
      <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-5 sm:left-5 sm:right-5 z-20 flex items-center justify-between gap-1.5 sm:gap-3 pointer-events-none">
        {/* Left: Mobile Inline Zoom Controls & Badges */}
        <div className="flex items-center gap-1.5 pointer-events-auto min-w-0">
          {/* Mobile Zoom [-] [+] Buttons */}
          <div className="sm:hidden flex items-center bg-[#ffffff]/95 backdrop-blur-md border border-border shadow-md rounded overflow-hidden shrink-0">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fastx:map:zoom_out'));
              }}
              className="w-8 h-8 flex items-center justify-center text-text hover:bg-surface-dim active:bg-surface-low text-base font-black transition-colors select-none cursor-pointer"
              aria-label="Zoom out"
              title="Zoom Out"
            >
              −
            </button>
            <div className="w-[1px] h-4 bg-border" />
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fastx:map:zoom_in'));
              }}
              className="w-8 h-8 flex items-center justify-center text-text hover:bg-surface-dim active:bg-surface-low text-base font-black transition-colors select-none cursor-pointer"
              aria-label="Zoom in"
              title="Zoom In"
            >
              +
            </button>
          </div>

          {/* Mobile: Ultra-sleek single-line badges */}
          <div className="sm:hidden flex items-center gap-1 font-mono text-[10px] min-w-0">
            <div className="bg-[#ffffff]/95 backdrop-blur-md border border-border border-l-2 border-l-primary px-2 py-1.5 flex items-center gap-1 shadow-md shrink-0">
              <span className="text-text-muted uppercase font-bold text-[8.5px]">Active:</span>
              <span className="font-black text-text">{displayActiveCount}</span>
            </div>

            {activeShipment && activeShipment.status !== 'DELIVERED' && activeShipment.status !== 'CANCELLED' && (
              <div className="bg-[#ffffff]/95 backdrop-blur-md border border-border border-l-2 border-l-amber-500 px-2 py-1.5 shadow-md truncate max-w-[125px]">
                <span className="font-black text-amber-800 uppercase tracking-tight text-[8.5px] truncate block">
                  {activeShipment.status.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Desktop spacer so default zoom controls aren't blocked */}
          <div className="w-14 hidden sm:block" />

          {/* Desktop Full Live Stats Widgets */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden sm:flex items-center gap-2 md:gap-3 pointer-events-auto font-mono text-xs shadow-xl"
          >
            <div className="bg-[#ffffff]/95 backdrop-blur-md border border-border border-l-[3px] border-l-primary px-3 md:px-4 py-2">
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                Active Deliveries
              </p>
              <p className="text-base md:text-lg font-black text-text">{displayActiveCount}</p>
            </div>

            {activeShipment && activeShipment.status !== 'DELIVERED' && activeShipment.status !== 'CANCELLED' && (
              <div className="bg-[#ffffff]/95 backdrop-blur-md border border-border border-l-[3px] border-l-amber-500 px-3 md:px-4 py-2">
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Waybill Status
                </p>
                <p className="text-xs md:text-sm font-black text-amber-700 uppercase tracking-tight truncate max-w-[160px]">
                  {activeShipment.status.replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: Map Layers & Live Feed Badge (Live feed hidden on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto font-mono text-xs shadow-xl shrink-0">
          {/* Map Layer Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-8 px-2 sm:h-auto sm:p-2 bg-[#ffffff]/95 backdrop-blur-md border border-border transition-colors cursor-pointer flex items-center justify-center ${
                isFilterOpen ? 'text-primary border-primary' : 'text-text hover:border-text-dim'
              }`}
              title="Map Filters"
              aria-label="Map Filters"
            >
              <span className="material-symbols-outlined text-base">filter_alt</span>
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-10 sm:top-11 right-0 w-56 bg-surface-elevated border border-border shadow-2xl p-3 flex flex-col gap-3 z-50 font-mono text-xs"
                >
                  <div className="flex justify-between items-center border-b border-border pb-1.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-text">
                      Map Layers
                    </h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="text-text-muted hover:text-text text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setFilters((f) => ({ ...f, showRiders: !f.showRiders }))}
                  >
                    <span className="text-[11px] text-text-muted">Available Riders</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold ${
                        filters.showRiders
                          ? 'bg-primary/20 text-primary'
                          : 'bg-surface-low text-text-dim'
                      }`}
                    >
                      {filters.showRiders ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setFilters((f) => ({ ...f, showHubs: !f.showHubs }))}
                  >
                    <span className="text-[11px] text-text-muted">Regional Hubs</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold ${
                        filters.showHubs
                          ? 'bg-primary/20 text-primary'
                          : 'bg-surface-low text-text-dim'
                      }`}
                    >
                      {filters.showHubs ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Feed Indicator — Hidden on mobile to free up space */}
          <div className="hidden sm:flex bg-[#ffffff]/95 backdrop-blur-md border border-border px-2.5 py-2 items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Active Shipment Card or Empty State */}
      {activeShipment ? (
        <ActiveShipmentCard
          shipment={activeShipment}
          pickupResolution={pickupResolution}
          dropoffResolution={dropoffResolution}
          riderCoords={riderCoords}
          onDetails={() => setShowDetailsModal(true)}
          onIntercept={() => {}}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 left-4 z-20"
        >
          <EmptyState
            icon="explore"
            title="No Active Shipments"
            description="Your active routes and tracking updates will appear here."
            actionLabel="New Booking"
            onAction={() => navigateTo('booking_wizard')}
          />
        </motion.div>
      )}

      {/* On-Screen Booking Details Modal */}
      <BookingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        orderId={activeShipment?.id}
        riderCoords={riderCoords}
      />
    </div>
  );
}