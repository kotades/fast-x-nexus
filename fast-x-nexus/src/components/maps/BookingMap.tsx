'use client';

/**
 * /src/components/maps/BookingMap.tsx
 * Fast X Nexus — Booking Map Coordinate Picker
 *
 * Provides an interactive Leaflet workspace for customers to pin their pickup
 * and dropoff coordinates, displaying dynamic markers and path vectors.
 */

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Manually link to unpkg hosted default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import 'leaflet/dist/leaflet.css';

// Div icons for clear visual contrast matching Monolith rules
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

interface BookingMapProps {
  pickupCoords: { lat: number; lng: number } | null;
  dropoffCoords: { lat: number; lng: number } | null;
  activeSelector: 'pickup' | 'dropoff';
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapEventsHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function BookingMap({
  pickupCoords,
  dropoffCoords,
  activeSelector,
  onLocationSelect,
}: BookingMapProps) {
  const defaultCenter: [number, number] = [5.5244, 5.7500]; // Effurun/Warri Default Center

  return (
    <div className="w-full h-full relative" style={{ minHeight: '350px' }}>
      <MapContainer
        center={pickupCoords ? [pickupCoords.lat, pickupCoords.lng] : defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventsHandler onSelect={onLocationSelect} />

        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={pickupIcon}>
            <Popup>
              <span className="text-gray-900 font-sans text-xs font-bold">Pickup Landmark</span>
            </Popup>
          </Marker>
        )}

        {dropoffCoords && (
          <Marker position={[dropoffCoords.lat, dropoffCoords.lng]} icon={dropoffIcon}>
            <Popup>
              <span className="text-gray-900 font-sans text-xs font-bold">Dropoff Destination</span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 border border-slate-200 px-3 py-1.5 text-[10px] text-slate-700 font-mono shadow-md select-none rounded">
        Click on the map to set: <span className="font-bold uppercase text-[#15803d]">{activeSelector}</span>
      </div>
    </div>
  );
}
