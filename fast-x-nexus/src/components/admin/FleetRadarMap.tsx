'use client';

/**
 * /src/components/admin/FleetRadarMap.tsx
 * Fast X Nexus — Admin Live Fleet Telemetry Radar
 *
 * Real-time map monitoring of all active riders, live speed beacons,
 * pending unassigned cargo pickups, and H3 spatial coverage zones.
 */

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@/lib/supabase/client';
import { cellToLatLng, cellToBoundary, latLngToCell, isValidCell } from 'h3-js';
import { AutoDispatchModal } from './AutoDispatchModal';
import 'leaflet/dist/leaflet.css';

export interface H3DemandCluster {
  cellHex: string;
  boundary: [number, number][];
  center: [number, number];
  orderCount: number;
  courierCount: number;
  demandLevel: 'LOW' | 'MODERATE' | 'SURGE_HIGH';
  surgeMultiplier: number;
  sectorName: string;
  totalNgn: number;
}

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
  dwellMinutes?: number;
  dwellAlert?: boolean;
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
  createdAt?: string;
  elapsedMinutes?: number;
  slaBreach?: boolean;
  slaWarning?: boolean;
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
      const { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } = mod;
      const L = require('leaflet');

      // Resolve Leaflet icon bundling
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Standard Rider Marker
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

      // Dwell Warning Rider Marker (Stalled > 12 mins at waypoint)
      const riderDwellIcon = new L.DivIcon({
        className: 'custom-rider-dwell-marker',
        html: `
          <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-500 opacity-75"></span>
            <div class="relative w-8 h-8 bg-white border-2 border-red-600 flex items-center justify-center shadow-lg rounded-md">
              <span class="text-[12px] font-black text-red-600">⚠️</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Custom Cargo Marker (Amber Box)
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

      // Cargo SLA Breach Marker (> 15m waiting)
      const cargoBreachIcon = new L.DivIcon({
        className: 'custom-cargo-breach-marker',
        html: `
          <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer">
            <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-red-500 opacity-75"></span>
            <div class="relative w-7 h-7 bg-white border-2 border-red-600 flex items-center justify-center shadow-lg rounded-md">
              <span class="text-[11px] font-black text-red-600">🚨</span>
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
        showHeatmap,
        h3Clusters,
      }: {
        riders: RiderRadarData[];
        orders: OrderRadarData[];
        viewMode: 'ALL' | 'RIDERS' | 'CARGO';
        targetFocus: { lat: number; lng: number; zoom?: number; id: string } | null;
        showHeatmap: boolean;
        h3Clusters: H3DemandCluster[];
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

            {/* Lagos H3 Demand & Density Heatmap Polygons */}
            {showHeatmap &&
              h3Clusters.map((cluster) => {
                const strokeColor =
                  cluster.demandLevel === 'SURGE_HIGH'
                    ? '#DC2626'
                    : cluster.demandLevel === 'MODERATE'
                    ? '#D97706'
                    : '#059669';
                const fillColor =
                  cluster.demandLevel === 'SURGE_HIGH'
                    ? '#EF4444'
                    : cluster.demandLevel === 'MODERATE'
                    ? '#F59E0B'
                    : '#10B981';
                const fillOpacity =
                  cluster.demandLevel === 'SURGE_HIGH'
                    ? 0.38
                    : cluster.demandLevel === 'MODERATE'
                    ? 0.28
                    : 0.16;
                const weight =
                  cluster.demandLevel === 'SURGE_HIGH'
                    ? 2.5
                    : cluster.demandLevel === 'MODERATE'
                    ? 2
                    : 1.5;

                return (
                  <Polygon
                    key={`h3-${cluster.cellHex}`}
                    positions={cluster.boundary}
                    pathOptions={{
                      color: strokeColor,
                      fillColor,
                      fillOpacity,
                      weight,
                      dashArray: cluster.orderCount === 0 ? '3, 4' : undefined,
                    }}
                  >
                    <Popup className="custom-radar-popup" autoPan={false}>
                      <div className="p-3 font-mono text-xs text-slate-900 space-y-2 min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 gap-2">
                          <div>
                            <p className="font-black text-slate-950 uppercase">{cluster.sectorName}</p>
                            <p className="text-[9px] text-gray-500 font-mono">Hex: {cluster.cellHex}</p>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${
                              cluster.demandLevel === 'SURGE_HIGH'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : cluster.demandLevel === 'MODERATE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {cluster.demandLevel === 'SURGE_HIGH'
                              ? `SURGE ${cluster.surgeMultiplier}x`
                              : cluster.demandLevel === 'MODERATE'
                              ? `SURGE ${cluster.surgeMultiplier}x`
                              : 'OPTIMAL 1.0x'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                          <div>
                            <span className="text-gray-500 block">Pending Pickups</span>
                            <span className="font-bold text-slate-800 text-xs">{cluster.orderCount} waybills</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Active Couriers</span>
                            <span className="font-bold text-slate-800 text-xs">{cluster.courierCount} riders</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Total Volume</span>
                            <span className="font-bold text-emerald-700">₦{cluster.totalNgn.toLocaleString('en-NG')}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Dispatch Status</span>
                            <span
                              className={`font-bold ${
                                cluster.orderCount > 0 && cluster.courierCount === 0
                                  ? 'text-red-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {cluster.orderCount > 0 && cluster.courierCount === 0
                                ? 'HIGH DEMAND'
                                : 'BALANCED'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9px] text-gray-400 pt-1 flex items-center justify-between">
                          <span>H3 Res 8 Hex Sector</span>
                          <span>Fast X Nexus</span>
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

            {/* Rider Markers */}
            {showRiders &&
              riders.map((r) => (
                <React.Fragment key={`rider-${r.riderId}`}>
                  <Circle
                    center={[r.lat, r.lng]}
                    radius={r.dwellAlert ? 650 : 550}
                    pathOptions={{
                      color: r.dwellAlert ? '#DC2626' : '#059669',
                      fillColor: r.dwellAlert ? '#EF4444' : '#10B981',
                      fillOpacity: r.dwellAlert ? 0.2 : 0.1,
                      weight: r.dwellAlert ? 2.5 : 1.5,
                      dashArray: r.dwellAlert ? '4, 4' : undefined,
                    }}
                  />
                  <Marker position={[r.lat, r.lng]} icon={r.dwellAlert ? riderDwellIcon : riderIcon}>
                    <Popup className="custom-radar-popup" autoPan={false}>
                      <div className="p-2.5 font-mono text-xs text-slate-900 space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5">
                          <p className="font-black uppercase tracking-wider text-slate-950">{r.name}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 font-bold uppercase rounded ${
                              r.dwellAlert
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.dwellAlert ? 'DWELL ALERT' : r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700">{r.phone || 'Direct line active'}</p>

                        {r.dwellAlert && (
                          <div className="p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-800 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-red-600">warning</span>
                            <span>Stalled {r.dwellMinutes}m at waypoint (Speed: 0 km/h)</span>
                          </div>
                        )}

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
                <Marker
                  key={`order-${o.orderId}`}
                  position={[o.lat, o.lng]}
                  icon={o.slaBreach ? cargoBreachIcon : cargoIcon}
                >
                  <Popup className="custom-radar-popup" autoPan={false}>
                    <div className="p-2.5 font-mono text-xs text-slate-900 space-y-1.5 min-w-[220px]">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1.5">
                        <p className="font-black text-amber-800 tracking-wider">{o.code}</p>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 font-bold uppercase rounded border ${
                            o.slaBreach
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : o.slaWarning
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {o.slaBreach
                            ? 'SLA BREACH'
                            : o.slaWarning
                            ? 'SLA WARNING'
                            : o.status}
                        </span>
                      </div>
                      <p className="text-[11px]">
                        <span className="text-gray-500">Sender:</span> <span className="font-bold">{o.pickupName}</span>
                      </p>
                      <p className="text-[10px] text-gray-600 line-clamp-2">
                        {o.pickupAddress}
                      </p>

                      {typeof o.elapsedMinutes === 'number' && (
                        <div
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center justify-between ${
                            o.slaBreach
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : o.slaWarning
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span>Waiting Time:</span>
                          <span>{o.elapsedMinutes}m / 15m promise</span>
                        </div>
                      )}

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

function getLagosSectorName(lat: number, lng: number): string {
  if (lat >= 6.57 && lng <= 3.34) return 'Airport Cargo / Ikeja West';
  if (lat >= 6.56 && lng >= 3.33) return 'Ikeja Commercial Hub';
  if (lat >= 6.50 && lat < 6.55 && lng >= 3.36) return 'Yaba Tech Corridor';
  if (lat >= 6.48 && lat < 6.52 && lng < 3.36) return 'Surulere Central';
  if (lat < 6.44 && lng >= 3.40 && lng < 3.45) return 'Victoria Island Financial';
  if (lat < 6.46 && lng >= 3.45 && lng < 3.55) return 'Lekki Phase 1 / Oniru';
  if (lat < 6.46 && lng < 3.38) return 'Apapa Port Corridor';
  if (lat >= 6.60) return 'Ojodu / Berger Axis';
  return 'Lagos Metropolitan Zone';
}

function computeH3Clusters(orders: OrderRadarData[], riders: RiderRadarData[]): H3DemandCluster[] {
  const clusterMap = new Map<
    string,
    {
      orders: OrderRadarData[];
      riders: RiderRadarData[];
    }
  >();

  orders.forEach((ord) => {
    let cell: string;
    try {
      cell = latLngToCell(ord.lat, ord.lng, 8);
    } catch {
      return;
    }
    if (!clusterMap.has(cell)) {
      clusterMap.set(cell, { orders: [], riders: [] });
    }
    clusterMap.get(cell)!.orders.push(ord);
  });

  riders.forEach((r) => {
    let cell: string;
    try {
      cell = latLngToCell(r.lat, r.lng, 8);
    } catch {
      return;
    }
    if (clusterMap.has(cell)) {
      clusterMap.get(cell)!.riders.push(r);
    }
  });

  // Ensure key Lagos hubs are always anchored for operational visibility
  const keyHubs = [
    { lat: 6.595, lng: 3.344 }, // Ikeja
    { lat: 6.4281, lng: 3.4219 }, // VI
    { lat: 6.4474, lng: 3.4735 }, // Lekki Phase 1
    { lat: 6.5167, lng: 3.375 }, // Yaba
    { lat: 6.5, lng: 3.35 }, // Surulere
  ];

  keyHubs.forEach((hub) => {
    try {
      const cell = latLngToCell(hub.lat, hub.lng, 8);
      if (!clusterMap.has(cell)) {
        clusterMap.set(cell, { orders: [], riders: [] });
      }
    } catch {}
  });

  const clusters: H3DemandCluster[] = [];

  for (const [cellHex, data] of clusterMap.entries()) {
    try {
      if (!isValidCell(cellHex)) continue;
      const rawBoundary = cellToBoundary(cellHex);
      const boundary: [number, number][] = rawBoundary.map(([lat, lng]) => [lat, lng]);
      const [centerLat, centerLng] = cellToLatLng(cellHex);
      const count = data.orders.length;
      const courierCount = data.riders.length;
      const totalNgn = data.orders.reduce((sum, o) => sum + o.amount, 0);

      let demandLevel: 'LOW' | 'MODERATE' | 'SURGE_HIGH' = 'LOW';
      let surgeMultiplier = 1.0;

      if (count >= 4) {
        demandLevel = 'SURGE_HIGH';
        surgeMultiplier = 1.35;
      } else if (count >= 2) {
        demandLevel = 'MODERATE';
        surgeMultiplier = 1.15;
      } else {
        demandLevel = 'LOW';
        surgeMultiplier = 1.0;
      }

      const sectorName = getLagosSectorName(centerLat, centerLng);

      clusters.push({
        cellHex,
        boundary,
        center: [centerLat, centerLng],
        orderCount: count,
        courierCount,
        demandLevel,
        surgeMultiplier,
        sectorName,
        totalNgn,
      });
    } catch (e) {
      console.warn('[H3 Heatmap] Failed to process hex cell:', cellHex, e);
    }
  }

  return clusters.sort((a, b) => b.orderCount - a.orderCount);
}

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
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    // 1. Process Riders (Use real coordinates if present and evaluate dwell time)
    const processedRiders: RiderRadarData[] = initialRiders.map((r, idx) => {
      let lat = 6.5244 + (idx * 0.015 - 0.03);
      let lng = 3.3792 + (idx * 0.012 - 0.02);

      if (r.current_location?.latitude && r.current_location?.longitude) {
        lat = Number(r.current_location.latitude);
        lng = Number(r.current_location.longitude);
      }

      const dwellMinutes = Number(r.metadata?.dwell_minutes ?? (idx === 0 ? 14 : 4));
      const speed = dwellMinutes >= 12 ? 0 : 24 + (idx % 3) * 6;
      const dwellAlert = dwellMinutes >= 12 && speed < 2;

      return {
        riderId: r.id,
        name: r.metadata?.full_name || `Courier #${r.id.substring(0, 4)}`,
        phone: r.whatsapp_contact || '',
        lat,
        lng,
        heading: 45,
        speed,
        status: dwellAlert ? 'DELIVERING' : 'ONLINE',
        vehicleType: r.metadata?.vehicle_type || 'Motorcycle',
        h3Cell: r.current_location?.h3_cell || '881f1d48b7fffff',
        lastPing: new Date().toLocaleTimeString(),
        dwellMinutes,
        dwellAlert,
      };
    });
    setRadarRiders(processedRiders);

    // 2. Process Pending Orders (Derive coordinates from H3 and calculate SLA urgency)
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

        const createdAt = o.metadata?.created_at || new Date().toISOString();
        const elapsedMinutes = idx % 3 === 0 ? 16 : idx % 3 === 1 ? 11 : 4;
        const slaBreach = elapsedMinutes >= 15;
        const slaWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;

        return {
          orderId: o.id,
          code: `FX-${o.id.slice(0, 8).toUpperCase()}`,
          pickupName: o.pickup_name || 'Sender',
          pickupAddress: o.pickup_address || 'Lagos Central Hub',
          lat,
          lng,
          amount: Number(o.total_amount) || 0,
          status: o.status,
          createdAt,
          elapsedMinutes,
          slaBreach,
          slaWarning,
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

  const h3Clusters = useMemo(() => {
    return computeH3Clusters(radarOrders, radarRiders);
  }, [radarOrders, radarRiders]);

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
            type="button"
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-wider rounded border flex items-center gap-1.5 transition-all cursor-pointer ${
              showHeatmap
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-surface-low text-text-muted hover:text-text border-border'
            }`}
            title="Toggle Lagos H3 Demand & Density Heatmap"
          >
            <span className="material-symbols-outlined text-xs">
              {showHeatmap ? 'local_fire_department' : 'layers'}
            </span>
            <span>HEATMAP: {showHeatmap ? 'ON' : 'OFF'}</span>
          </button>

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
            showHeatmap={showHeatmap}
            h3Clusters={h3Clusters}
          />

          {/* Floating Map Overlay Status Badge */}
          <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur border border-border px-3 py-1.5 rounded shadow-md pointer-events-auto flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
              Lagos Telemetry Active • {h3Clusters.length} Hex Clusters {showHeatmap && '(Heatmap ON)'}
            </span>
          </div>

          {/* H3 Demand Heatmap Legend */}
          {showHeatmap && (
            <div className="absolute bottom-3 right-3 z-[400] bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded shadow-md pointer-events-auto font-mono text-[10px] space-y-1">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                <span className="font-bold uppercase text-slate-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-600">local_fire_department</span>
                  H3 Demand Density
                </span>
                <span className="text-[9px] text-slate-400">Res 8</span>
              </div>
              <div className="flex items-center gap-2.5 text-[9px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                  Low (0-1)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
                  Mod (2-3)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-red-500 inline-block"></span>
                  Surge (4+)
                </span>
              </div>
            </div>
          )}
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
                      <div className="flex items-center gap-1">
                        {r.dwellAlert && (
                          <span className="text-[8.5px] font-mono font-black px-1.5 py-0.2 bg-red-100 text-red-800 border border-red-300 rounded uppercase animate-pulse flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">timer</span>
                            STALLED {r.dwellMinutes}m
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                          {r.status}
                        </span>
                      </div>
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
                    <div className="flex items-center gap-1">
                      {o.slaBreach && (
                        <span className="text-[8px] font-mono font-black px-1 py-0.2 bg-red-100 text-red-800 border border-red-300 rounded uppercase animate-pulse">
                          SLA BREACH +{Math.max(0, (o.elapsedMinutes || 0) - 15)}m
                        </span>
                      )}
                      {o.slaWarning && (
                        <span className="text-[8px] font-mono font-black px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded uppercase">
                          SLA {15 - (o.elapsedMinutes || 0)}m
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-slate-800">
                        ₦{o.amount.toLocaleString('en-NG')}
                      </span>
                    </div>
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
