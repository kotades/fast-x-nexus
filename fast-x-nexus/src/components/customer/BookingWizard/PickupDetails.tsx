'use client';

/**
 * /src/components/customer/BookingWizard/PickupDetails.tsx
 * Fast X Nexus — Pickup Location Detection & H3 Spatial Indexing
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';
import { AddressAutocomplete, LocationSelection } from '@/components/customer/ui/AddressAutocomplete';
import { getH3CellFromCoords } from '@/lib/geo/h3';
import { getUserProfile } from '@/app/actions/profile';

export function PickupDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [preferredAddress, setPreferredAddress] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPreferred() {
      try {
        const res = await getUserProfile();
        if (res.success && res.data?.metadata?.preferred_pickup_address) {
          const addr = (res.data.metadata.preferred_pickup_address as string).trim();
          if (addr && isMounted) {
            setPreferredAddress(addr);
          }
        }
      } catch (e) {
        console.warn('[PickupDetails] Could not load preferred address:', e);
      }
    }
    loadPreferred();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-prefill if preferred address exists and pickupAddress is currently empty
  useEffect(() => {
    if (preferredAddress && !wizardData.pickupAddress) {
      updateWizardData({ pickupAddress: preferredAddress });
    }
  }, [preferredAddress, wizardData.pickupAddress, updateWizardData]);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setGeoStatus('Acquiring high-accuracy GPS fix...');

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
            console.warn('[PickupDetails] Reverse geocode fallback to coords:', err);
          }

          updateWizardData({
            pickupCoords: coords,
            pickupAddress: detectedAddress,
          });

          setGeoStatus('Location acquired successfully!');
          setIsLocating(false);
          setTimeout(() => setGeoStatus(null), 3000);
        },
        (error) => {
          console.error('[PickupDetails] Error getting location:', error);
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
      pickupCoords: { lat: loc.lat, lng: loc.lng },
      pickupAddress: loc.address,
    });
  };

  const pickupCell = wizardData.pickupCoords
    ? getH3CellFromCoords(wizardData.pickupCoords.lat, wizardData.pickupCoords.lng)
    : null;

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
            STEP 1 OF 4 / ORIGIN
          </span>
          <h2 className="text-xl font-black text-text uppercase tracking-tight">
            Pickup Details
          </h2>
        </div>
        <p className="text-xs text-text-muted font-mono">
          Enter sender details and pickup landmark
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Row 1: Sender Name & WhatsApp Number (Side by Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Sender Name"
            prefix="person"
            placeholder="e.g. Sanni Dunsimi"
            value={wizardData.pickupName}
            onChange={(e) => updateWizardData({ pickupName: e.target.value })}
          />

          <Input
            label="Phone Number (WhatsApp)"
            type="tel"
            prefix="call"
            placeholder="e.g. +234 812 345 6789"
            value={wizardData.pickupPhone}
            onChange={(e) => updateWizardData({ pickupPhone: e.target.value })}
          />
        </div>

        {/* Row 2: Live Address Autocomplete with Integrated GPS Pill */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Pickup Address / Landmark
            </label>
            <div className="flex items-center gap-2">
              {preferredAddress && (
                <button
                  type="button"
                  onClick={() => updateWizardData({ pickupAddress: preferredAddress })}
                  className="px-2.5 py-1 bg-surface border border-primary/40 hover:border-primary text-[10px] font-bold text-primary transition-all flex items-center gap-1 uppercase cursor-pointer shadow-xs"
                  title={`Fill preferred address: ${preferredAddress}`}
                >
                  <span className="material-symbols-outlined text-[13px]">home</span>
                  <span>Use Preferred Address</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[10px] font-bold text-primary hover:text-primary transition-all flex items-center gap-1 uppercase disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isLocating ? 'hourglass_empty' : 'my_location'}
                </span>
                <span>{isLocating ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
              </button>
            </div>
          </div>

          <AddressAutocomplete
            label=""
            placeholder="Type street name, estate, or landmark (e.g. 1004 Estate, Victoria Island, Lagos)..."
            prefixIcon="near_me"
            value={wizardData.pickupAddress}
            currentCoords={wizardData.pickupCoords}
            onChange={(val) => updateWizardData({ pickupAddress: val })}
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
