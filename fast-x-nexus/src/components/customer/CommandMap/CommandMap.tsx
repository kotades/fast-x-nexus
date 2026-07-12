'use client';

/**
 * CommandMap — Main Command Map Orchestrator
 *
 * Full-height map canvas with hex-pattern bg, Leaflet base layer.
 * Now wired directly to Supabase Realtime for Rider locations and H3 bounds.
 * Uses ssr: false dynamic import in the parent page.
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { ActiveShipmentCard } from './ActiveShipmentCard';
import { EmptyState } from '@/components/customer/shared/EmptyState';
import { DynamicMap } from '@/components/maps/DynamicMap';
import { createBrowserClient } from '@/lib/supabase/client';

const QuickStats = ({ activeDeliveriesCount }: { activeDeliveriesCount: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
    className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-4 pointer-events-none"
  >
    <div className="bg-[#ffffff]/90 backdrop-blur-md border border-border/50 shadow-sm px-5 py-3 pointer-events-auto min-w-[160px]">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Active Deliveries</p>
      <p className="text-2xl font-black text-text">{activeDeliveriesCount}</p>
    </div>
    <div className="bg-[#ffffff]/90 backdrop-blur-md border border-border/50 shadow-sm px-5 py-3 pointer-events-auto min-w-[200px]">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">System Status</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
        </span>
        <span className="text-sm font-medium text-text">All Systems Operational</span>
      </div>
    </div>
  </motion.div>
);

export function CommandMap() {
  const { activeShipment, navigateTo, activeDeliveriesCount } = useCustomerDashboard();
  const [riderCoords, setRiderCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    showRiders: true,
    showHubs: false,
    showPickups: true
  });
  const filterRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Close filter on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          event: '*', // Listen to INSERT and UPDATE
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

  return (
    <div className="relative w-full h-full hex-pattern overflow-hidden">
      {/* Leaflet Base Map */}
      <div className="absolute inset-0">
        <DynamicMap 
          pickupCell={activeShipment?.pickupH3Cell}
          dropoffCell={activeShipment?.dropoffH3Cell}
          riderCoords={riderCoords}
          riderName={activeShipment?.riderId ? "Assigned Courier" : undefined}
          filters={filters}
        />
      </div>

      {/* Quick Stats Ribbon */}
      <QuickStats activeDeliveriesCount={activeDeliveriesCount} />

      {/* Top Right Controls — Glass Panel */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-6 right-6 z-10 flex gap-3"
      >
        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
          <div className="glass-panel p-1 flex gap-1 shadow-sm h-full">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 transition-colors cursor-pointer ${isFilterOpen ? 'text-primary bg-primary/10' : 'text-text hover:bg-surface-low'}`}
              title="Map Filters"
              aria-label="Map Filters"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">filter_alt</span>
            </button>
          </div>
          
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute top-14 right-0 w-64 bg-[#ffffff]/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-4 flex flex-col gap-4 z-50 origin-top-right"
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-text">Map Layers</h3>
                  <button onClick={() => setIsFilterOpen(false)} className="text-text-muted hover:text-text">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                
                {/* Toggle: Show Riders */}
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setFilters(f => ({...f, showRiders: !f.showRiders}))}>
                  <span className="text-sm font-semibold text-text-muted">Available Riders</span>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${filters.showRiders ? 'bg-primary' : 'bg-surface-low border border-border'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${filters.showRiders ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Toggle: Hubs */}
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setFilters(f => ({...f, showHubs: !f.showHubs}))}>
                  <span className="text-sm font-semibold text-text-muted">Regional Hubs</span>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${filters.showHubs ? 'bg-primary' : 'bg-surface-low border border-border'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${filters.showHubs ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Toggle: Pickups */}
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setFilters(f => ({...f, showPickups: !f.showPickups}))}>
                  <span className="text-sm font-semibold text-text-muted">Active Pickups</span>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${filters.showPickups ? 'bg-primary' : 'bg-surface-low border border-border'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${filters.showPickups ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Feed Indicator */}
        <div className="glass-panel px-3 py-2 shadow-sm flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Live Feed Active
          </span>
        </div>
      </motion.div>

      {/* Active Shipment Card or Empty State */}
      {activeShipment ? (
        <ActiveShipmentCard
          shipment={activeShipment}
          onDetails={() => {}}
          onIntercept={() => {}}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 left-6 z-20"
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
    </div>
  );
}