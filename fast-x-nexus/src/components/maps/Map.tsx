'use client';

/**
 * /src/components/maps/Map.tsx
 * Fast X Nexus — Enterprise Leaflet Telemetry Map
 *
 * Features:
 * 1. OpenStreetMap High-Speed Tile Layer (Zero Watermarks / Zero API Key Required)
 * 2. Floating Bouncing Text Badges on Waypoint & Courier Icons
 * 3. Progressive Waypoint Disclosure (Gated Dropoff until Pickup Verified)
 * 4. Standby Mode (Only shows rider location when no active job is assigned)
 * 5. Dynamic Dual Polylines (Dashed Dispatch Line + Solid Forest Green Journey Corridor)
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cellToBoundary, cellToLatLng } from 'h3-js';
import type { DynamicMapProps } from './DynamicMap';

// Resolve Leaflet icon bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import 'leaflet/dist/leaflet.css';

const isNigeriaCoords = (coords: [number, number] | null): boolean => {
  if (!coords) return false;
  const [lat, lng] = coords;
  return lat >= 4.0 && lat <= 14.0 && lng >= 2.5 && lng <= 15.0;
};

// Custom SVG Icons with Floating Bouncing Text Badges
const createCustomMarker = (color: string, label: string, iconName: string, badgeBg: string, badgeBorder: string, badgeText: string) => {
  return L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; pointer-events: auto;">
        <!-- Floating Bouncing Text Badge -->
        <div style="animation: bounce 1.8s infinite; margin-bottom: 3px; padding: 2px 7px; background-color: ${badgeBg}; color: ${badgeText}; border: 1.5px solid ${badgeBorder}; border-radius: 4px; font-size: 9px; font-family: monospace; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
          ${label}
        </div>
        <!-- Pin Icon Box -->
        <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
          <span class="material-symbols-outlined" style="font-size: 20px;">${iconName}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${color};"></div>
      </div>
    `,
    className: 'custom-callout-icon',
    iconSize: [120, 70],
    iconAnchor: [60, 70],
  });
};

const pickupIcon = createCustomMarker(
  '#16a34a',
  'PICKUP ORIGIN',
  'inventory_2',
  '#ffffff',
  '#16a34a',
  '#15803d'
);

const dropoffIcon = createCustomMarker(
  '#dc2626',
  'DESTINATION',
  'flag',
  '#ffffff',
  '#dc2626',
  '#b91c1c'
);

const createRiderIcon = (badgeText: string = 'FAST X COURIER') => {
  return L.divIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
        <!-- Floating Bouncing Text Badge -->
        <div style="animation: bounce 1.8s infinite; margin-bottom: 3px; padding: 2px 7px; background-color: #ffffff; color: #15803d; border: 1.5px solid #16a34a; border-radius: 4px; font-size: 9px; font-family: monospace; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          ${badgeText}
        </div>
        <!-- Courier Circle Icon -->
        <div style="background-color: #ffffff; width: 38px; height: 38px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #16a34a; color: #16a34a; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          <span class="material-symbols-outlined" style="font-size: 22px;">two_wheeler</span>
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #16a34a;"></div>
      </div>
    `,
    className: 'rider-courier-icon',
    iconSize: [140, 72],
    iconAnchor: [70, 72],
  });
};

const riderCourierIcon = createRiderIcon('FAST X COURIER');
const riderSelfIcon = createRiderIcon('YOU (COURIER)');

// Auto-Fit Bounds Component
function MapBoundsUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && Array.isArray(bounds) && bounds.length > 0) {
      try {
        if (bounds.length === 1) {
          map.setView(bounds[0] as [number, number], 14);
        } else {
          map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
        }
      } catch (e) {}
    }
  }, [map, bounds]);
  return null;
}

// Global Zoom Event Listener for Toolbar Controls
function MapZoomEventListener() {
  const map = useMap();
  useEffect(() => {
    const handleZoomIn = () => map.zoomIn();
    const handleZoomOut = () => map.zoomOut();
    window.addEventListener('fastx:map:zoom_in', handleZoomIn);
    window.addEventListener('fastx:map:zoom_out', handleZoomOut);
    return () => {
      window.removeEventListener('fastx:map:zoom_in', handleZoomIn);
      window.removeEventListener('fastx:map:zoom_out', handleZoomOut);
    };
  }, [map]);
  return null;
}

const mobileZoomOverrideStyles = `
  @media (max-width: 639px) {
    .leaflet-top.leaflet-left {
      display: none !important;
    }
  }
`;

export default function Map({
  pickupCell,
  dropoffCell,
  pickupCoords,
  dropoffCoords,
  riderCoords,
  pickupAddress = 'Pickup Location',
  dropoffAddress = 'Dropoff Location',
  riderName = 'Fast X Active Courier',
  status,
  viewer = 'rider',
  zoom = 13,
  pickupRadius = 180,
  dropoffRadius = 180,
  isEstimatedVicinity = false,
  isEstimatedPickup,
  isEstimatedDropoff = false,
  filters = { showRiders: true, showHubs: true, showPickups: true },
}: DynamicMapProps) {
  const pickupEstimated = isEstimatedPickup !== undefined ? isEstimatedPickup : isEstimatedVicinity;
  const dropoffEstimated = Boolean(isEstimatedDropoff);
  const isPickedUp = status === 'PICKED_UP' || status === 'IN_TRANSIT';
  const hasActiveJob = Boolean(status);
  const isCustomerViewer = viewer === 'customer';

  // Resolve Pickup LatLng
  let pickupLatLng: [number, number] | null = null;
  if (hasActiveJob || isCustomerViewer) {
    if (pickupCoords && isNigeriaCoords([pickupCoords.lat, pickupCoords.lng])) {
      pickupLatLng = [pickupCoords.lat, pickupCoords.lng];
    } else if (pickupCell) {
      try {
        const raw = cellToLatLng(pickupCell) as [number, number];
        if (isNigeriaCoords(raw)) pickupLatLng = raw;
      } catch {}
    }
  }

  // Resolve Dropoff LatLng — Always unmasked for customers, gated for couriers until pickup verified
  let dropoffLatLng: [number, number] | null = null;
  const canShowDropoff = isCustomerViewer ? (hasActiveJob || Boolean(dropoffCell || dropoffCoords)) : (hasActiveJob && isPickedUp);

  if (canShowDropoff) {
    if (dropoffCoords && isNigeriaCoords([dropoffCoords.lat, dropoffCoords.lng])) {
      dropoffLatLng = [dropoffCoords.lat, dropoffCoords.lng];
    } else if (dropoffCell) {
      try {
        const raw = cellToLatLng(dropoffCell) as [number, number];
        if (isNigeriaCoords(raw)) dropoffLatLng = raw;
      } catch {}
    }
  }

  const riderLatLng: [number, number] | null =
    riderCoords && isNigeriaCoords([riderCoords.lat, riderCoords.lng])
      ? [riderCoords.lat, riderCoords.lng]
      : null;

  // Active Points on Map
  const allPoints: [number, number][] = [];
  if (riderLatLng) allPoints.push(riderLatLng);
  if (pickupLatLng) allPoints.push(pickupLatLng);
  if (dropoffLatLng) allPoints.push(dropoffLatLng);

  const defaultCenter: [number, number] = [6.5244, 3.3792]; // Lagos Center
  const center: [number, number] = riderLatLng || pickupLatLng || defaultCenter;

  // 1. Delivery Corridor Line (Pickup Origin -> Dropoff Destination):
  // Clean route line strictly between pickup and dropoff (never diverted to courier)
  const deliveryRouteLine: [number, number][] = [];
  if (pickupLatLng && dropoffLatLng && (isCustomerViewer || hasActiveJob)) {
    deliveryRouteLine.push(pickupLatLng);
    deliveryRouteLine.push(dropoffLatLng);
  }

  // 2. Active Courier Trace:
  // Strictly connects courier to their active target waypoint (NEVER two lines attached to courier simultaneously):
  // - Stage 1 (Before Pickup): Courier -> Pickup Origin (Yellow/Amber dashed trace leading courier up to pickup)
  // - Stage 2 (In Transit): Courier -> Dropoff Destination (Forest green line leading courier to dropoff)
  const courierToPickupTrace: [number, number][] = [];
  const courierToDropoffTrace: [number, number][] = [];

  if (riderLatLng && hasActiveJob) {
    if (!isPickedUp && pickupLatLng) {
      courierToPickupTrace.push(riderLatLng);
      courierToPickupTrace.push(pickupLatLng);
    } else if (isPickedUp && dropoffLatLng) {
      courierToDropoffTrace.push(riderLatLng);
      courierToDropoffTrace.push(dropoffLatLng);
    }
  }

  return (
    <div className="w-full h-full relative bg-[#f8fafc]" style={{ minHeight: '400px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        className="z-10 bg-[#f8fafc]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <style>{mobileZoomOverrideStyles}</style>
        <MapZoomEventListener />

        {allPoints.length > 0 && <MapBoundsUpdater bounds={allPoints} />}

        {/* 1. Delivery Corridor Line (Pickup -> Dropoff): Solid Forest Green */}
        {deliveryRouteLine.length === 2 && (
          <>
            <Polyline
              positions={deliveryRouteLine}
              pathOptions={{
                color: '#16a34a',
                weight: 6,
                opacity: 0.2,
              }}
            />
            <Polyline
              positions={deliveryRouteLine}
              pathOptions={{
                color: '#16a34a',
                weight: 3.5,
                opacity: 0.85,
              }}
            />
          </>
        )}

        {/* 2A. Stage 1 Courier Trace (Courier -> Pickup): Yellow/Amber trace leading courier up to pickup */}
        {courierToPickupTrace.length === 2 && (
          <>
            <Polyline
              positions={courierToPickupTrace}
              pathOptions={{
                color: '#f59e0b',
                weight: 6,
                opacity: 0.25,
              }}
            />
            <Polyline
              positions={courierToPickupTrace}
              pathOptions={{
                color: '#d97706',
                weight: 3,
                dashArray: '6, 6',
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* 2B. Stage 2 Courier Trace (Courier -> Dropoff): Green trace leading courier to dropoff */}
        {courierToDropoffTrace.length === 2 && (
          <>
            <Polyline
              positions={courierToDropoffTrace}
              pathOptions={{
                color: '#059669',
                weight: 6,
                opacity: 0.25,
              }}
            />
            <Polyline
              positions={courierToDropoffTrace}
              pathOptions={{
                color: '#10b981',
                weight: 3.5,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* 3. Pickup Location with Pulsing Radar Vicinity Detection Circle */}
        {pickupLatLng && (
          <>
            {/* Outer Pulsing Vicinity Circle */}
            <Circle
              center={pickupLatLng}
              radius={Math.max(300, pickupRadius || 180)}
              pathOptions={{
                color: '#16a34a',
                fillColor: '#22c55e',
                fillOpacity: 0.18,
                weight: 2.5,
                dashArray: '6, 6',
                className: 'pulse-vicinity-circle',
              }}
            />
            {/* Inner Core Anchor Ring */}
            <Circle
              center={pickupLatLng}
              radius={Math.max(80, Math.round((pickupRadius || 180) * 0.35))}
              pathOptions={{
                color: '#15803d',
                fillColor: '#16a34a',
                fillOpacity: 0.32,
                weight: 2,
              }}
            />
            <Marker 
              position={pickupLatLng} 
              icon={pickupEstimated 
                ? createCustomMarker('#16a34a', `APPROX AREA (±${pickupRadius || 180}M)`, 'radar', '#ffffff', '#16a34a', '#15803d')
                : pickupIcon
              }
            >
              <Popup>
                <div className="text-gray-900 font-sans p-1 text-xs">
                  <p className="font-black uppercase text-emerald-700">
                    {pickupEstimated ? '⚠️ Detected Approximate Area' : '✓ Origin / Pickup'}
                  </p>
                  <p className="font-semibold text-gray-800 mt-0.5">{pickupAddress}</p>
                  {pickupEstimated && (
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-1 rounded font-sans mt-1">
                      ⚠️ Approximate area (quarter / suburb). Please confirm building on map.
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {pickupLatLng[0].toFixed(4)}, {pickupLatLng[1].toFixed(4)} (±{pickupRadius || 180}m accuracy)
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 4. Dropoff Location with Vicinity Circle (Unlocked on Pickup or Customer View) */}
        {dropoffLatLng && (
          <>
            <Circle
              center={dropoffLatLng}
              radius={dropoffRadius || 180}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#dc2626',
                fillOpacity: dropoffEstimated ? 0.16 : 0.08,
                weight: 2,
                dashArray: '5, 5',
                className: 'pulse-vicinity-circle',
              }}
            />
            <Marker 
              position={dropoffLatLng} 
              icon={dropoffEstimated
                ? createCustomMarker('#dc2626', `APPROX AREA (±${dropoffRadius || 180}M)`, 'radar', '#ffffff', '#dc2626', '#b91c1c')
                : dropoffIcon
              }
            >
              <Popup>
                <div className="text-gray-900 font-sans p-1 text-xs">
                  <p className="font-black uppercase text-red-600">
                    {dropoffEstimated ? '⚠️ Detected Approximate Area' : '✓ Destination / Dropoff'}
                  </p>
                  <p className="font-semibold text-gray-800 mt-0.5">{dropoffAddress}</p>
                  {dropoffEstimated && (
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-1 rounded font-sans mt-1">
                      ⚠️ Approximate area (quarter / suburb). Courier will call recipient upon approach.
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 font-mono mt-1">
                    {dropoffLatLng[0].toFixed(4)}, {dropoffLatLng[1].toFixed(4)} (±{dropoffRadius || 180}m accuracy)
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Rider Courier Marker with Floating Text */}
        {riderLatLng && (
          <Marker position={riderLatLng} icon={isCustomerViewer ? riderCourierIcon : riderSelfIcon}>
            <Popup>
              <div className="text-gray-900 font-sans p-1 text-xs">
                <p className="font-black uppercase text-emerald-600">{riderName}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                  GPS: {riderLatLng[0].toFixed(4)}, {riderLatLng[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
