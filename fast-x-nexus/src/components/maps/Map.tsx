'use client';

/**
 * /src/components/maps/Map.tsx
 * Fast X Nexus — Leaflet Map Component
 *
 * Renders spatial entities: Pickup Hub (Forest Green), Dropoff Hub (Red),
 * Active Rider (Custom Courier Marker), Polyline Routing, and H3 Hexagon boundaries.
 * Must be loaded dynamically with { ssr: false } to prevent Node-side errors.
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { cellToBoundary, cellToLatLng } from 'h3-js';


// Resolve Leaflet's default marker asset bundling issue on standard builds
// by manually linking to unpkg hosted assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Import Leaflet CSS in client-only context
import 'leaflet/dist/leaflet.css';

// Custom Markers
const createSvgIcon = (color: string, label: string) => {
  return L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background-color: ${color}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); color: #ffffff; font-weight: bold; font-size: 11px;">
          ${label}
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${color};"></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 44],
    iconAnchor: [16, 44],
  });
};

const pickupIcon = createSvgIcon('#347227', 'PK'); // Forest Green
const dropoffIcon = createSvgIcon('#EF4444', 'DP'); // Red

// Rider Truck Icon
const riderIcon = L.divIcon({
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="background-color: #111827; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 2px solid #22C55E; box-shadow: 0 2px 6px rgba(0,0,0,0.4); color: #22C55E;">
        <span class="material-symbols-outlined" style="font-size: 20px;">local_shipping</span>
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #111827;"></div>
    </div>
  `,
  className: 'rider-div-icon',
  iconSize: [36, 48],
  iconAnchor: [18, 48],
});

interface MapProps {
  pickupCell?: string;
  dropoffCell?: string;
  riderCoords?: { lat: number; lng: number } | null;
  riderName?: string;
  zoom?: number;
  filters?: {
    showRiders: boolean;
    showHubs: boolean;
    showPickups: boolean;
  };
}

export default function Map({
  pickupCell,
  dropoffCell,
  riderCoords,
  riderName = 'Active Rider',
  zoom = 13,
  filters = { showRiders: true, showHubs: true, showPickups: true },
}: MapProps) {
  // Convert H3 cells to LatLng pairs
  const pickupLatLng = pickupCell ? (cellToLatLng(pickupCell) as [number, number]) : null;
  const dropoffLatLng = dropoffCell ? (cellToLatLng(dropoffCell) as [number, number]) : null;

  // Compute neighboring hexagon boundary for pickup cell
  const pickupHexBoundary = pickupCell
    ? (cellToBoundary(pickupCell) as [number, number][])
    : [];

  const dropoffHexBoundary = dropoffCell
    ? (cellToBoundary(dropoffCell) as [number, number][])
    : [];

  // Determine center of map
  const defaultCenter: [number, number] = [5.5244, 5.7500]; // Effurun/Warri Default Nigeria Center
  const center: [number, number] =
    riderCoords
      ? [riderCoords.lat, riderCoords.lng]
      : pickupLatLng
      ? pickupLatLng
      : defaultCenter;

  // Build routing polyline path: Rider -> Pickup -> Dropoff
  const routePath: [number, number][] = [];
  if (riderCoords) routePath.push([riderCoords.lat, riderCoords.lng]);
  if (pickupLatLng) routePath.push(pickupLatLng);
  if (dropoffLatLng) routePath.push(dropoffLatLng);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        className="z-10"
      >
        {/* OpenStreetMap Light CartoDB Style (to fit Swiss Modernism 2.0 light aesthetic) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Pickup Zone Hexagon Overlay (Active Pickups Filter) */}
        {filters.showPickups && pickupHexBoundary.length > 0 && (
          <Polygon
            positions={pickupHexBoundary}
            pathOptions={{
              color: '#347227',
              fillColor: '#347227',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Dropoff Zone Hexagon Overlay (Regional Hubs Filter) */}
        {filters.showHubs && dropoffHexBoundary.length > 0 && (
          <Polygon
            positions={dropoffHexBoundary}
            pathOptions={{
              color: '#EF4444',
              fillColor: '#EF4444',
              fillOpacity: 0.05,
              weight: 1,
              dashArray: '3, 3',
            }}
          />
        )}

        {/* Route Line (Show only if all components of the route are allowed by filters, or just show it if Rider is shown. Let's bind it to showRiders for active routes) */}
        {filters.showRiders && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: '#E4A800', // Gold dashed line
              weight: 3,
              dashArray: '8, 8',
              opacity: 0.8,
            }}
          />
        )}

        {/* Pickup Marker */}
        {filters.showPickups && pickupLatLng && (
          <Marker position={pickupLatLng} icon={pickupIcon}>
            <Popup>
              <div className="text-gray-900 font-sans p-1">
                <p className="font-bold text-xs uppercase text-[#347227]">Pickup Hub</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">{pickupCell}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {filters.showHubs && dropoffLatLng && (
          <Marker position={dropoffLatLng} icon={dropoffIcon}>
            <Popup>
              <div className="text-gray-900 font-sans p-1">
                <p className="font-bold text-xs uppercase text-red-600">Dropoff Location</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">{dropoffCell}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Rider Marker */}
        {filters.showRiders && riderCoords && (
          <Marker position={[riderCoords.lat, riderCoords.lng]} icon={riderIcon}>
            <Popup>
              <div className="text-gray-900 font-sans p-1">
                <p className="font-bold text-xs uppercase text-[#111827]">{riderName}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                  Coords: {riderCoords.lat.toFixed(5)}, {riderCoords.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
