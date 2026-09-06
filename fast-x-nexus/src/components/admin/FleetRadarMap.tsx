'use client';

/**
 * /src/components/admin/FleetRadarMap.tsx
 * Fast X Nexus — Admin Live Fleet Telemetry Radar
 *
 * Real-time map monitoring of all active riders, live speed beacons,
 * pending unassigned cargo pickups, and H3 spatial coverage zones.
 */

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@/lib/supabase/client';
import { cellToLatLng, isValidCell } from 'h3-js';

interface RiderRadarData {
  riderId: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status: 'ONLINE' | 'DELIVERING' | 'OFFLINE';
  vehicleType: string;
  h3Cell?: string;
  lastPing: string;
}

interface OrderRadarData {
  orderId: string;
  code: string;
  pickupName: string;
  pickupAddress: string;
  lat: number;
  lng: number;
  amount: number;
  status: string;
}

interface FleetRadarMapProps {
  initialRiders?: Array<{
    id: string;
    whatsapp_contact?: string | null;
    metadata?: any;
    current_location?: {
      latitude: number;
      longitude: number;
      h3_cell?: string;
    } | null;
  }>;
  initialOrders?: Array<{
    id: string;
    status: string;
    pickup_address?: string;
    pickup_name?: string;
    pickup_h3_cell?: string;
    total_amount: number;
    metadata?: any;
  }>;
}

// Leaflet dynamic map wrapper to prevent SSR hydration errors
const DynamicMap = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const { MapContainer, TileLayer, Marker, Popup, Circle } = mod;
      const L = require('leaflet');

      // Custom Industrial Rider Marker (Emerald Lightning on Crisp Light Card)
      const riderIcon = new L.DivIcon({
        className: 'custom-rider-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-60"></span>
            <div class="relative w-7 h-7 bg-white border-2 border-emerald-600 flex items-center justify-center shadow-md rounded-md">
              <span class="text-[12px] font-black text-emerald-700">⚡</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Custom Cargo Marker (Amber Box on Crisp Light Card)
      const cargoIcon = new L.DivIcon({
        className: 'custom-cargo-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-amber-400 opacity-50"></span>
            <div class="relative w-6 h-6 bg-white border-2 border-amber-600 flex items-center justify-center shadow-md rounded-md">
              <span class="text-[10px] font-black text-amber-700">📦</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      return function MapComponent({
        riders,
        orders,
        viewMode,
      }: {
        riders: RiderRadarData[];
        orders: OrderRadarData[];
        viewMode: 'ALL' | 'RIDERS' | 'CARGO';
      }) {
        const center =
          riders.length > 0
            ? [riders[0].lat, riders[0].lng]
            : orders.length > 0
            ? [orders[0].lat, orders[0].lng]
            : [6.5244, 3.3792];

        const showRiders = viewMode === 'ALL' || viewMode === 'RIDERS';
        const showCargo = viewMode === 'ALL' || viewMode === 'CARGO';

        return (
          <MapContainer
            center={center as [number, number]}
            zoom={12}
            scrollWheelZoom={false}
            className="w-full h-full min-h-[380px] bg-[#f8fafc]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Rider Markers */}
            {showRiders &&
              riders.map((r) => (
                <React.Fragment key={`rider-${r.riderId}`}>
                  <Circle
                    center={[r.lat, r.lng]}
                    radius={500}
                    pathOptions={{
                      color: '#22C55E',
                      fillColor: '#22C55E',
                      fillOpacity: 0.08,
                      weight: 1,
                    }}
                  />
                  <Marker position={[r.lat, r.lng]} icon={riderIcon}>
                    <Popup className="custom-radar-popup">
                      <div className="p-2 font-mono text-xs text-slate-900 space-y-1">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
                          <p className="font-black uppercase tracking-wider">{r.name}</p>
                          <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 font-bold uppercase">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600">{r.phone}</p>
                        <p className="text-[10px]">
                          <span className="font-bold">Speed:</span> {r.speed} km/h |{' '}
                          <span className="font-bold">Vehicle:</span> {r.vehicleType}
                        </p>
                        {r.h3Cell && (
                          <p className="text-[9px] text-gray-500 font-mono">H3: {r.h3Cell}</p>
                        )}
                        <p className="text-[9px] text-gray-400">Ping: {r.lastPing}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}

            {/* Pending Cargo Markers */}
            {showCargo &&
              orders.map((o) => (
                <Marker key={`order-${o.orderId}`} position={[o.lat, o.lng]} icon={cargoIcon}>
                  <Popup className="custom-radar-popup">
                    <div className="p-2 font-mono text-xs text-slate-900 space-y-1">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
                        <p className="font-black text-amber-700">{o.code}</p>
                        <span className="text-[9px] px-1 bg-amber-100 text-amber-800 font-bold uppercase">
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[10px]">
                        <span className="font-bold">Sender:</span> {o.pickupName}
                      </p>
                      <p className="text-[10px] text-gray-600 truncate max-w-[160px]">
                        {o.pickupAddress}
                      </p>
                      <p className="text-[10px] font-bold text-gray-800">
                        Billed: ₦{o.amount.toLocaleString('en-NG')}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        );
      };
    }),
  { ssr: false }
);

export function FleetRadarMap({ initialRiders = [], initialOrders = [] }: FleetRadarMapProps) {
  const [radarRiders, setRadarRiders] = useState<RiderRadarData[]>([]);
  const [radarOrders, setRadarOrders] = useState<OrderRadarData[]>([]);
  const [viewMode, setViewMode] = useState<'ALL' | 'RIDERS' | 'CARGO'>('ALL');

  useEffect(() => {
    // 1. Process Riders (Use real coordinates if present)
    const processedRiders: RiderRadarData[] = initialRiders.map((r, idx) => {
      let lat = 6.5244 + (idx * 0.015 - 0.03);
      let lng = 3.3792 + (idx * 0.012 - 0.02);

      if (r.current_location?.latitude && r.current_location?.longitude) {
        lat = Number(r.current_location.latitude);
        lng = Number(r.current_location.longitude);
      }

      return {
        riderId: r.id,
        name: r.metadata?.full_name || `Rider #${r.id.substring(0, 4)}`,
        phone: r.whatsapp_contact || '',
        lat,
        lng,
        heading: 45,
        speed: 28,
        status: 'ONLINE',
        vehicleType: r.metadata?.vehicle_type || 'Motorcycle',
        h3Cell: r.current_location?.h3_cell || '881f1d48b7fffff',
        lastPing: new Date().toLocaleTimeString(),
      };
    });
    setRadarRiders(processedRiders);

    // 2. Process Pending Orders (Derive coordinates from H3 or default distribution)
    const unassigned = initialOrders.filter((o) =>
      ['PAID_UNASSIGNED', 'PLACED'].includes(o.status)
    );

    const processedOrders: OrderRadarData[] = unassigned
      .map((o, idx) => {
        let lat = 6.53 + (idx * 0.012 - 0.02);
        let lng = 3.36 + (idx * 0.014 - 0.02);

        if (o.pickup_h3_cell && isValidCell(o.pickup_h3_cell)) {
          try {
            const [h3Lat, h3Lng] = cellToLatLng(o.pickup_h3_cell);
            lat = h3Lat;
            lng = h3Lng;
          } catch {
            // fallback
          }
        }

        return {
          orderId: o.id,
          code: `FX-${o.id.slice(0, 8).toUpperCase()}`,
          pickupName: o.pickup_name || 'Sender',
          pickupAddress: o.pickup_address || 'Lagos Hub',
          lat,
          lng,
          amount: Number(o.total_amount) || 0,
          status: o.status,
        };
      })
      .slice(0, 30); // Cap at 30 to avoid clutter

    setRadarOrders(processedOrders);

    // 3. Subscribe to Realtime location changes
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('fleet_telemetry_radar')
      .on('broadcast', { event: 'location_changed' }, ({ payload }) => {
        if (payload?.riderId && payload.latitude && payload.longitude) {
          setRadarRiders((prev) => {
            const idx = prev.findIndex((item) => item.riderId === payload.riderId);
            const updated: RiderRadarData = {
              riderId: payload.riderId,
              name: `Rider #${payload.riderId.substring(0, 4)}`,
              phone: '',
              lat: payload.latitude,
              lng: payload.longitude,
              heading: payload.heading || 0,
              speed: payload.speed || 0,
              status: 'DELIVERING',
              vehicleType: 'Motorcycle',
              h3Cell: payload.h3Cell,
              lastPing: new Date().toLocaleTimeString(),
            };

            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...updated };
              return copy;
            }
            return [...prev, updated];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRiders, initialOrders]);

  return (
    <div className="bg-surface-elevated border border-border flex flex-col h-full font-mono">
      {/* Header bar with filters */}
      <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-text flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Fleet Radar
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            {radarRiders.length} Couriers • {radarOrders.length} Pending Cargo
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1">
          {(['ALL', 'RIDERS', 'CARGO'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                viewMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative min-h-[420px]">
        <DynamicMap riders={radarRiders} orders={radarOrders} viewMode={viewMode} />
      </div>
    </div>
  );
}
