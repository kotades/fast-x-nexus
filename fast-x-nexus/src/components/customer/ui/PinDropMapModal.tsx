'use client';

/**
 * /src/components/customer/ui/PinDropMapModal.tsx
 * Fast X Nexus — Interactive Precision Pin-Drop Map Modal
 *
 * Allows customers to drag and pinpoint their exact house, gate,
 * or compound on a satellite/street map with sub-100m H3 precision.
 */

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { getH3CellFromCoords } from '@/lib/geo/h3';

interface PinDropMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat: number;
  initialLng: number;
  initialAddress: string;
  onConfirmLocation: (loc: { address: string; lat: number; lng: number; h3Cell: string }) => void;
  title?: string;
}

// Dynamic Leaflet Map with center marker tracking
const DynamicPinMap = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const { MapContainer, TileLayer, useMapEvents } = mod;

      function MapCenterWatcher({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
        const map = useMapEvents({
          move() {
            const center = map.getCenter();
            onCenterChange(center.lat, center.lng);
          },
          moveend() {
            const center = map.getCenter();
            onCenterChange(center.lat, center.lng);
          },
        });
        return null;
      }

      return function PinMapComponent({
        centerLat,
        centerLng,
        onPinMoved,
      }: {
        centerLat: number;
        centerLng: number;
        onPinMoved: (lat: number, lng: number) => void;
      }) {
        return (
          <div className="relative w-full h-[360px] md:h-[420px] bg-[#f8fafc]">
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={16}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterWatcher onCenterChange={onPinMoved} />
            </MapContainer>

            {/* Centered Fixed Crosshair Pin */}
            <div className="absolute inset-0 pointer-events-none z-[1000] flex items-center justify-center -translate-y-4">
              <div className="relative flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-primary drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-bounce">
                  location_on
                </span>
                <div className="w-2.5 h-1 bg-black/40 rounded-full blur-[1px]"></div>
              </div>
            </div>

            <div className="absolute top-3 left-3 z-[1000] bg-surface-elevated/90 backdrop-blur-sm border border-border px-3 py-1.5 text-[10px] font-mono font-bold text-text shadow-md flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary" aria-hidden="true">pin_drop</span>
              <span>Drag map to align pin with your exact gate/rooftop</span>
            </div>
          </div>
        );
      };
    }),
  { ssr: false }
);

export function PinDropMapModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialAddress,
  onConfirmLocation,
  title = 'Pinpoint Exact Location',
}: PinDropMapModalProps) {
  const [currentLat, setCurrentLat] = useState(initialLat || 6.5244);
  const [currentLng, setCurrentLng] = useState(initialLng || 3.3792);
  const [resolvedAddress, setResolvedAddress] = useState(initialAddress || '');
  const [isResolving, setIsResolving] = useState(false);

  // Sync when opened
  React.useEffect(() => {
    if (isOpen) {
      setCurrentLat(initialLat || 6.5244);
      setCurrentLng(initialLng || 3.3792);
      setResolvedAddress(initialAddress || '');
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  const handlePinMoved = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
  };

  const handleConfirm = async () => {
    setIsResolving(true);
    let finalAddress = resolvedAddress;

    // Quick reverse lookup on confirm
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLng}&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          finalAddress = data.display_name;
        }
      }
    } catch {
      // fallback to coords string
    }

    const h3Cell = getH3CellFromCoords(currentLat, currentLng, 9); // High-precision Res 9 (~100m)

    onConfirmLocation({
      address: finalAddress || `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`,
      lat: currentLat,
      lng: currentLng,
      h3Cell,
    });

    setIsResolving(false);
    onClose();
  };

  const currentH3 = getH3CellFromCoords(currentLat, currentLng, 9);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface-elevated border border-border max-w-xl w-full shadow-2xl font-mono text-text overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-low">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  SPATIAL CALIBRATION
                </p>
                <h3 className="text-sm font-black uppercase tracking-wider text-text">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Map Canvas */}
            <div className="relative">
              <DynamicPinMap
                centerLat={currentLat}
                centerLng={currentLng}
                onPinMoved={handlePinMoved}
              />
            </div>

            {/* Coordinates & Action Bar */}
            <div className="p-4 bg-surface-elevated border-t border-border space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs bg-surface-low p-2.5 border border-border">
                <div>
                  <span className="text-text-dim text-[10px] uppercase font-bold block">GPS Coordinates</span>
                  <span className="font-bold text-text">{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-text-dim text-[10px] uppercase font-bold block">H3 Spatial Index (Res 9)</span>
                  <span className="font-bold text-primary">{currentH3}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border text-xs uppercase font-bold text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isResolving}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-xs uppercase font-black tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {isResolving ? 'LOCKING LOCATION...' : 'LOCK IN EXACT PIN LOCATION'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
