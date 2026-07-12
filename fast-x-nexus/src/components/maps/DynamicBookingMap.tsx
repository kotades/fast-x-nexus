'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DynamicPickerMap = dynamic(() => import('./BookingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#111827] border border-gray-800 flex items-center justify-center min-h-[350px]">
      <div className="flex flex-col items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22C55E]"></span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Loading Map Layer...</span>
      </div>
    </div>
  ),
});

interface DynamicBookingMapProps {
  pickupCoords: { lat: number; lng: number } | null;
  dropoffCoords: { lat: number; lng: number } | null;
  activeSelector: 'pickup' | 'dropoff';
  onLocationSelect: (lat: number, lng: number) => void;
}

export function DynamicBookingMap(props: DynamicBookingMapProps) {
  return <DynamicPickerMap {...props} />;
}
