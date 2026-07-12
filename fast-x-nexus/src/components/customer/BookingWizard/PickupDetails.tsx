'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';
import { getH3CellFromCoords } from '@/lib/geo/h3';

export function PickupDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          // For MVP, we might also want to reverse-geocode to get the address string,
          // but we'll just set the coords for now.
          updateWizardData({ 
            pickupCoords: coords,
            pickupAddress: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (GPS Location)`
          });
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location', error);
          alert('Could not get your location. Please enter your address manually.');
          setIsLocating(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
    }
  };

  const pickupCell = wizardData.pickupCoords 
    ? getH3CellFromCoords(wizardData.pickupCoords.lat, wizardData.pickupCoords.lng) 
    : null;

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-2xl font-bold text-text mb-6 tracking-tight">PICKUP DETAILS</h1>

      <div className="space-y-6">
        <Input
          label="Your Name"
          prefix="person"
          value={wizardData.pickupName}
          onChange={(e) => updateWizardData({ pickupName: e.target.value })}
        />
        
        <Input
          label="Phone Number"
          type="tel"
          prefix="call"
          value={wizardData.pickupPhone}
          onChange={(e) => updateWizardData({ pickupPhone: e.target.value })}
        />

        <div className="relative">
          <Input
            label="Pickup Address"
            prefix="my_location"
            value={wizardData.pickupAddress}
            onChange={(e) => updateWizardData({ pickupAddress: e.target.value })}
          />
          <button 
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="mt-2 text-xs font-bold text-primary hover:text-primary-text transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isLocating ? 'hourglass_empty' : 'gps_fixed'}
            </span>
            {isLocating ? 'Locating...' : 'USE MY CURRENT LOCATION'}
          </button>
        </div>

        {pickupCell && (
          <div className="mt-4 p-3 bg-surface-low border border-border text-sm flex justify-between items-center">
            <span className="text-text-muted">H3 Index:</span>
            <span className="font-mono font-bold text-primary">{pickupCell}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
