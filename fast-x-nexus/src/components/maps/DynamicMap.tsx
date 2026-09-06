'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically load the Leaflet map renderer client-side only
const LeafletMap = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-low border border-border flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Loading Map Layer...</span>
      </div>
    </div>
  ),
});

export interface DynamicMapProps {
  pickupCell?: string;
  dropoffCell?: string;
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  riderCoords?: { lat: number; lng: number } | null;
  pickupAddress?: string;
  dropoffAddress?: string;
  riderName?: string;
  status?: string;
  jobId?: string;
  viewer?: 'customer' | 'rider';
  zoom?: number;
  pickupRadius?: number;
  dropoffRadius?: number;
  isEstimatedVicinity?: boolean;
  isEstimatedPickup?: boolean;
  isEstimatedDropoff?: boolean;
  filters?: {
    showRiders: boolean;
    showHubs: boolean;
    showPickups: boolean;
  };
}

export function DynamicMap(props: DynamicMapProps) {
  return <LeafletMap {...props} />;
}
