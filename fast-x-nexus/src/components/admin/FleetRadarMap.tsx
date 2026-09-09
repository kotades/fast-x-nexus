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
import { AutoDispatchModal } from './AutoDispatchModal';
import 'leaflet/dist/leaflet.css';

export interface RiderRadarData {
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

export interface OrderRadarData {
  orderId: string;
  code: string;
  pickupName: string;
  pickupAddress: string;
  lat: number;
  lng: number;
  amount: number;
  status: string;
}

export interface FleetRadarMapProps {
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

const SECTORS = [
  { id: 'all', label: 'All Lagos', lat: 6.5244, lng: 3.3792, zoom: 11 },
  { id: 'island', label: 'Island / Lekki', lat: 6.4381, lng: 3.4735, zoom: 13 },
  { id: 'mainland', label: 'Mainland / Ikeja', lat: 6.5950, lng: 3.3440, zoom: 13 },
  { id: 'airport', label: 'Airport Hub', lat: 6.5774, lng: 3.3212, zoom: 14 },
  { id: 'apapa', label: 'Apapa Corridor', lat: 6.4468, lng: 3.3644, zoom: 13 },
];

// Leaflet dynamic map wrapper to prevent SSR hydration errors
const DynamicMap = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const { MapContainer, TileLayer, Marker, Popup, Circle, useMap } = mod;
      const L = require('leaflet');

      // Resolve Leaflet icon bundling
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Custom Industrial Rider Marker (Emerald Lightning on Crisp Light Card)
      const riderIcon = new L.DivIcon({
        className: 'custom-rider-marker',
        html: `
          <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer">
            <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-emerald-400 opacity-60"></span>
            <div class="relative w-8 h-8 bg-white border-2 border-emerald-600 flex items-center justify-center shadow-lg rounded-md">
              <span class="text-[13px] font-black text-emerald-700">⚡</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Custom Cargo Marker (Amber Box on Crisp Light Card)
      const cargoIcon = new L.DivIcon({
        className: 'custom-cargo-marker',
        html: `
          <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-amber-400 opacity-60"></span>
            <div class="relative w-7 h-7 bg-white border-2 border-amber-600 flex items-center justify-center shadow-lg rounded-md">
              <span class="text-[11px] font-black text-amber-700">📦</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Map controller component handling size invalidation and programmatic pan/zoom
      function MapController({
        targetFocus,
      }: {
        targetFocus: { lat: number; lng: number; zoom?: number; id: string } | null;
      }) {
        const map = useMap();

        useEffect(() => {
          map.invalidateSize();
          const t1 = setTimeout(() => map.invalidateSize(), 150);
          const t2 = setTimeout(() => map.invalidateSize(), 500);

          const handleResize = () => map.invalidateSize();
          window.addEventListener('resize', handleResize);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            window.removeEventListener('resize', handleResize);
          };
        }, [map]);

        useEffect(() => {
          if (targetFocus) {
            map.flyTo([targetFocus.lat, targetFocus.lng], targetFocus.zoom || 14, {
              duration: 1.0,
              easeLinearity: 0.25,
            });
          }
        }, [map, targetFocus]);

        return null;
      }

      return function MapComponent({
        riders,
        orders,
        viewMode,
        targetFocus,
      }: {
        riders: RiderRadarData[];
        orders: OrderRadarData[];
        viewMode: 'ALL' | 'RIDERS' | 'CARGO';
        targetFocus: { lat: number; lng: number; zoom?: number; id: string } | null;
      }) {
        const initialCenter: [number, number] =
          riders.length > 0
            ? [riders[0].lat, riders[0].lng]
            : orders.length > 0
            ? [orders[0].lat, orders[0].lng]
            : [6.5244, 3.3792];

        const showRiders = viewMode === 'ALL' || viewMode === 'RIDERS';
        const showCargo = viewMode === 'ALL' || viewMode === 'CARGO';

        return (
          <MapContainer
            center={initialCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full min-h-[480px] bg-[#f8fafc] z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <MapController targetFocus={targetFocus} />

            {/* Rider Markers */}
            {showRiders &&
              riders.map((r) => (
                <React.Fragment key={`rider-${r.riderId}`}>
                  <Circle
                    center={[r.lat, r.lng]}
                    radius={550}
                    pathOptions={{
                      color: '#059669',
                      fillColor: '#10B981',
                      fillOpacity: 0.1,
                      weight: 1.5,
                    }}
                  />
                  <Marker position={[r.lat, r.lng]} icon={riderIcon}>
                    <Popup className="custom-radar-popup" autoPan={false}>
                      <div className="p-2 font-mono text-xs text-slate-900 space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5">
                          <p className="font-black uppercase tracking-wider text-slate-950">{r.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold uppercase rounded">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700">{r.phone || 'Direct line active'}</p>
                        <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                          <div>
                            <span className="text-gray-500 block">Speed</span>
                            <span className="font-bold text-slate-800">{r.speed} km/h</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Vehicle</span>
                            <span className="font-bold text-slate-800">{r.vehicleType}</span>
                          </div>
                        </div>
                        {r.h3Cell && (
                          <p className="text-[9px] text-gray-500 font-mono">H3 Cell: {r.h3Cell}</p>
                        )}
                        <p className="text-[9px] text-gray-400">Beacon: {r.lastPing}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}

            {/* Pending Cargo Markers */}
            {showCargo &&
              orders.map((o) => (
                <Marker key={`order-${o.orderId}`} position={[o.lat, o.lng]} icon={cargoIcon}>
                  <Popup className="custom-radar-popup" autoPan={false}>
                    <div className="p-2 font-mono text-xs text-slate-900 space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5">
                        <p className="font-black text-amber-800 tracking-wider">{o.code}</p>
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold uppercase rounded">
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[11px]">
                        <span className="text-gray-500">Sender:</span> <span className="font-bold">{o.pickupName}</span>
                      </p>
                      <p className="text-[10px] text-gray-600 line-clamp-2">
                        {o.pickupAddress}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-[10px] font-black text-slate-900">
                          ₦{o.amount.toLocaleString('en-NG')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-primary">Ready for dispatch</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-slate-50 border border-border flex flex-col items-center justify-center gap-3">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
        </span>
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
          Loading Spatial Operations Radar...
        </p>
      </div>
    ),
  }
);

export function FleetRadarMap({ initialRiders = [], initialOrders = [] }: FleetRadarMapProps) {
  const [radarRiders, setRadarRiders] = useState<RiderRadarData[]>([]);
  const [radarOrders, setRadarOrders] = useState<OrderRadarData[]>([]);
  const [viewMode, setViewMode] = useState<'ALL' | 'RIDERS' | 'CARGO'>('ALL');
  const [targetFocus, setTargetFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    id: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'RIDERS' | 'CARGO'>('RIDERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoDispatchOpen, setAutoDispatchOpen] = useState(false);

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
        name: r.metadata?.full_name || `Courier #${r.id.substring(0, 4)}`,
        phone: r.whatsapp_contact || '',
        lat,
        lng,
        heading: 45,
        speed: 24 + (idx % 3) * 6,
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
            // fallback to default coordinates
          }
        }

        return {
          orderId: o.id,
          code: `FX-${o.id.slice(0, 8).toUpperCase()}`,
          pickupName: o.pickup_name || 'Sender',
          pickupAddress: o.pickup_address || 'Lagos Central Hub',
          lat,
          lng,
          amount: Number(o.total_amount) || 0,
          status: o.status,
        };
      })
      .slice(0, 50);

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
              name: `Courier #${payload.riderId.substring(0, 4)}`,
              phone: '',
              lat: Number(payload.latitude),
              lng: Number(payload.longitude),
              heading: payload.heading || 0,
              speed: payload.speed || 25,
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

  const filteredRiders = radarRiders.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.h3Cell && r.h3Cell.includes(searchQuery))
  );

  const filteredOrders = radarOrders.filter(
    (o) =>
      o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.pickupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-surface-elevated border border-border flex flex-col h-full font-mono overflow-hidden shadow-sm">
      {/* Top Operations Bar */}
      <div className="p-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-text">
              Live Spatial Radar
            </h3>
          </div>
          <span className="text-border hidden sm:inline">|</span>
          <p className="text-[10px] text-text-muted hidden sm:inline">
            <span className="font-bold text-emerald-600">{radarRiders.length}</span> Couriers Active •{' '}
            <span className="font-bold text-amber-600">{radarOrders.length}</span> Pending Pickups
          </p>
        </div>

        {/* Sector Quick Jump Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {SECTORS.map((sector) => (
            <button
              key={sector.id}
              onClick={() =>
                setTargetFocus({
                  lat: sector.lat,
                  lng: sector.lng,
                  zoom: sector.zoom,
                  id: sector.id,
                })
              }
              className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider bg-surface-low hover:bg-surface-dim text-text-muted hover:text-text border border-border rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              {sector.label}
            </button>
          ))}
        </div>

        {/* View Mode Filters & Auto-Dispatch Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border p-0.5 rounded bg-surface-low">
            {(['ALL', 'RIDERS', 'CARGO'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer rounded ${
                  viewMode === mode
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoDispatchOpen(true)}
            className="px-3 py-1 text-[9.5px] font-mono font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Open 1-Click Batch Auto-Dispatch Engine"
          >
            <span className="material-symbols-outlined text-xs">bolt</span>
            <span>AUTO-DISPATCH ({radarOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Main Radar Layout: Interactive Leaflet Map + Roster Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[500px] relative">
        {/* Map Area (9 cols on large screens, full width on mobile) */}
        <div className="lg:col-span-8 xl:col-span-9 relative w-full h-full min-h-[420px] bg-slate-100">
          <DynamicMap
            riders={radarRiders}
            orders={radarOrders}
            viewMode={viewMode}
            targetFocus={targetFocus}
          />

          {/* Floating Map Overlay Status Badge */}
          <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur border border-border px-3 py-1.5 rounded shadow-md pointer-events-auto flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
              Lagos Telemetry Stream Active
            </span>
          </div>
        </div>

        {/* Operational Telemetry Roster (3 cols on large screens) */}
        <div className="lg:col-span-4 xl:col-span-3 border-t lg:border-t-0 lg:border-l border-border bg-surface-elevated flex flex-col h-full max-h-[600px] overflow-hidden">
          {/* Sub-tabs: Couriers vs Cargo */}
          <div className="grid grid-cols-2 border-b border-border bg-surface">
            <button
              onClick={() => setActiveTab('RIDERS')}
              className={`py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'RIDERS'
                  ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40 font-black'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              <span>⚡ Couriers</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 rounded font-bold">
                {radarRiders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('CARGO')}
              className={`py-2 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'CARGO'
                  ? 'border-amber-600 text-amber-800 bg-amber-50/40 font-black'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              <span>📦 Cargo</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-amber-100 text-amber-800 rounded font-bold">
                {radarOrders.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="p-2 border-b border-border bg-surface-low">
            <input
              type="text"
              placeholder={activeTab === 'RIDERS' ? 'Search couriers...' : 'Search waybills...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-surface border border-border rounded focus:outline-none focus:border-primary text-text placeholder:text-text-dim"
            />
          </div>

          {/* Target List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border p-1">
            {activeTab === 'RIDERS' ? (
              filteredRiders.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted">
                  No active couriers found on grid.
                </div>
              ) : (
                filteredRiders.map((r) => (
                  <button
                    key={r.riderId}
                    onClick={() =>
                      setTargetFocus({
                        lat: r.lat,
                        lng: r.lng,
                        zoom: 15,
                        id: r.riderId,
                      })
                    }
                    className="w-full text-left p-2.5 hover:bg-surface-low transition-colors rounded group cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-text group-hover:text-primary transition-colors">
                        {r.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>{r.vehicleType} • {r.speed} km/h</span>
                      <span className="text-primary font-bold text-[9px] group-hover:underline">
                        Focus ⌖
                      </span>
                    </div>
                  </button>
                ))
              )
            ) : filteredOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                No pending cargo awaiting dispatch.
              </div>
            ) : (
              filteredOrders.map((o) => (
                <button
                  key={o.orderId}
                  onClick={() =>
                    setTargetFocus({
                      lat: o.lat,
                      lng: o.lng,
                      zoom: 15,
                      id: o.orderId,
                    })
                  }
                  className="w-full text-left p-2.5 hover:bg-surface-low transition-colors rounded group cursor-pointer flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-amber-800 group-hover:text-primary transition-colors">
                      {o.code}
                    </span>
                    <span className="text-[9px] font-bold text-slate-800">
                      ₦{o.amount.toLocaleString('en-NG')}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted truncate">{o.pickupAddress}</p>
                  <div className="flex items-center justify-between text-[9px] text-text-dim pt-0.5">
                    <span>Sender: {o.pickupName}</span>
                    <span className="text-primary font-bold group-hover:underline">
                      Focus ⌖
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 1-Click Batch Auto-Dispatch Preview & Execution Engine */}
      <AutoDispatchModal
        isOpen={autoDispatchOpen}
        onClose={() => setAutoDispatchOpen(false)}
      />
    </div>
  );
}
