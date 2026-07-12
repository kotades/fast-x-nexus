'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';
import { getH3CellFromCoords } from '@/lib/geo/h3';

export function RecipientDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();

  // Mock Geocoding for MVP (Saves API credits)
  // Hardcodes coordinates around based on input length to simulate variance
  const handleGeocodeMock = (text: string) => {
    if (text.length < 3) return;
    
    // Simulate slight coordinate changes based on text length
    const baseLat = 5.5344;
    const baseLng = 5.7600;
    
    const offsetLat = (text.length * 0.001) * -1;
    const offsetLng = (text.length * 0.0015) * -1;
    
    const coords = { lat: baseLat + offsetLat, lng: baseLng + offsetLng };
    updateWizardData({ dropoffCoords: coords });
  };

  const dropoffCell = wizardData.dropoffCoords 
    ? getH3CellFromCoords(wizardData.dropoffCoords.lat, wizardData.dropoffCoords.lng) 
    : null;

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-2xl font-bold text-text mb-6 tracking-tight">RECIPIENT DETAILS</h1>

      <div className="space-y-6">
        <Input
          label="Recipient Name"
          prefix="person"
          value={wizardData.dropoffName}
          onChange={(e) => updateWizardData({ dropoffName: e.target.value })}
        />
        
        <Input
          label="Recipient Phone Number"
          type="tel"
          prefix="call"
          value={wizardData.dropoffPhone}
          onChange={(e) => updateWizardData({ dropoffPhone: e.target.value })}
        />

        <Input
          label="Delivery Address"
          prefix="location_on"
          value={wizardData.dropoffAddress}
          onChange={(e) => updateWizardData({ dropoffAddress: e.target.value })}
          onBlur={(e) => handleGeocodeMock(e.target.value)}
        />
        
        <p className="text-xs text-text-muted mt-1">
          * Type an address and click outside to simulate geocoding.
        </p>

        {dropoffCell && (
          <div className="mt-4 p-3 bg-surface-low border border-border text-sm flex justify-between items-center">
            <span className="text-text-muted">Dest H3 Index:</span>
            <span className="font-mono font-bold text-error">{dropoffCell}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
