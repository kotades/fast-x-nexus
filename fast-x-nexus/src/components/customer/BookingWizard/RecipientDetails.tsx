'use client';

/**
 * /src/components/customer/BookingWizard/RecipientDetails.tsx
 * Fast X Nexus — Recipient Location & Dropoff Details
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';
import { AddressAutocomplete, LocationSelection } from '@/components/customer/ui/AddressAutocomplete';

export function RecipientDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const handleUseRecipientLocation = () => {
    setIsLocating(true);
    setGeoStatus('Acquiring dropoff GPS fix...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const coords = { lat, lng };

          let detectedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)} (GPS Location)`;

          try {
            setGeoStatus('Resolving street address...');
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                detectedAddress = data.display_name;
              }
            }
          } catch (err) {
            console.warn('[RecipientDetails] Reverse geocode fallback:', err);
          }

          updateWizardData({
            dropoffCoords: coords,
            dropoffAddress: detectedAddress,
          });

          setGeoStatus('Dropoff location mapped successfully!');
          setIsLocating(false);
          setTimeout(() => setGeoStatus(null), 3000);
        },
        (error) => {
          console.error('[RecipientDetails] Error getting location:', error);
          setGeoStatus('GPS detection failed. Please search address below.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGeoStatus('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  };

  const handleSelectAutocomplete = (loc: LocationSelection) => {
    updateWizardData({
      dropoffCoords: { lat: loc.lat, lng: loc.lng },
      dropoffAddress: loc.address,
    });
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto font-sans"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Step Header (Hidden on mobile to maximize viewport) */}
      <div className="hidden sm:flex border-b border-border pb-2.5 mb-4 items-center justify-between gap-1">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-primary">
            STEP 2 OF 4 / DESTINATION
          </span>
          <h2 className="text-xl font-black text-text uppercase tracking-tight">
            Recipient Details
          </h2>
        </div>
        <p className="text-xs text-text-muted font-mono">
          Enter recipient details and dropoff destination
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Row 1: Recipient Name & Phone (Side by Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Recipient Name"
            prefix="person"
            placeholder="e.g. Dayzidee Logistics"
            value={wizardData.dropoffName}
            onChange={(e) => updateWizardData({ dropoffName: e.target.value })}
          />

          <Input
            label="Recipient Phone Number"
            type="tel"
            prefix="call"
            placeholder="e.g. +234 809 999 8888"
            value={wizardData.dropoffPhone}
            onChange={(e) => updateWizardData({ dropoffPhone: e.target.value })}
          />
        </div>

        {/* Row 2: Live Address Autocomplete with Integrated GPS Pill */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Delivery Address / Dropoff Landmark
            </label>
            <button
              type="button"
              onClick={handleUseRecipientLocation}
              disabled={isLocating}
              className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[10px] font-bold text-primary hover:text-primary transition-all flex items-center gap-1 uppercase disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[13px]">
                {isLocating ? 'hourglass_empty' : 'gps_fixed'}
              </span>
              <span>{isLocating ? 'Acquiring GPS...' : 'Use GPS Dropoff'}</span>
            </button>
          </div>

          <AddressAutocomplete
            label=""
            placeholder="Type street, district, or landmark (e.g. Oreyo, Igbogbo, Lekki Phase 1)..."
            prefixIcon="location_on"
            value={wizardData.dropoffAddress}
            currentCoords={wizardData.dropoffCoords}
            onChange={(val) => updateWizardData({ dropoffAddress: val })}
            onSelectLocation={handleSelectAutocomplete}
            accentColor="primary"
          />
        </div>

        {geoStatus && (
          <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase flex items-center gap-1 pt-0.5">
            <span className="material-symbols-outlined text-xs text-primary" aria-hidden="true">info</span>
            <span>{geoStatus}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
