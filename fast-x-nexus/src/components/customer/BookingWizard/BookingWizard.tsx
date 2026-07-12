'use client';

/**
 * BookingWizard — Full Booking Orchestrator
 *
 * 4-step wizard with AnimatePresence slide transitions.
 * Step 1: Pickup Details (Sender + Geo)
 * Step 2: Recipient Details (Receiver + Geo)
 * Step 3: Package Details
 * Step 4: Checkout
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Button } from '@/components/customer/ui/Button';
import { StepIndicator } from './StepIndicator';
import { PickupDetails } from './PickupDetails';
import { RecipientDetails } from './RecipientDetails';
import { PackageDetails } from './PackageDetails';
import { createBrowserClient } from '@/lib/supabase/client';
import { getH3CellFromCoords } from '@/lib/geo/h3';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function BookingWizard() {
  const { wizardStep, setWizardStep, navigateTo, wizardData, setActiveShipment } = useCustomerDashboard();
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createBrowserClient();

  const handleNext = async () => {
    if (wizardStep < 4) {
      setDirection(1);
      setWizardStep((wizardStep + 1) as any);
    } else if (wizardStep === 4) {
      // Final Checkout Step - Insert Data
      await handleCheckout();
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setDirection(-1);
      setWizardStep((wizardStep - 1) as any);
    }
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const pickupCell = wizardData.pickupCoords 
        ? getH3CellFromCoords(wizardData.pickupCoords.lat, wizardData.pickupCoords.lng) 
        : '8924300aa4bffff'; // Fallback
        
      const dropoffCell = wizardData.dropoffCoords 
        ? getH3CellFromCoords(wizardData.dropoffCoords.lat, wizardData.dropoffCoords.lng) 
        : '8924300aa4b0000'; // Fallback

      // 1. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: session.user.id,
          status: 'PAID_UNASSIGNED',
          pickup_h3_cell: pickupCell,
          dropoff_h3_cell: dropoffCell,
          pickup_name: wizardData.pickupName,
          pickup_phone: wizardData.pickupPhone,
          pickup_address: wizardData.pickupAddress,
          dropoff_name: wizardData.dropoffName,
          dropoff_phone: wizardData.dropoffPhone,
          dropoff_address: wizardData.dropoffAddress,
          preferred_delivery_time: wizardData.preferredDeliveryTime || null,
          total_amount: wizardData.budgetEstimate || 5000
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Parcel
      const weightMap = {
        'document': 1,
        'small_box': 5,
        'medium_box': 15,
      };
      
      const { error: parcelError } = await supabase
        .from('parcels')
        .insert({
          order_id: order.id,
          weight: wizardData.weightPreset ? weightMap[wizardData.weightPreset] : 5,
          description: wizardData.itemDescription || 'Standard Cargo',
          declared_value: wizardData.budgetEstimate || 0
        });

      if (parcelError) throw parcelError;

      // Update context to show the new order on the map
      if (setActiveShipment) {
        setActiveShipment({
          id: order.id,
          trackingCode: `TRK-${order.id.slice(0,8).toUpperCase()}`,
          status: order.status,
          origin: wizardData.pickupAddress,
          destination: wizardData.dropoffAddress,
          progress: 10,
          weight: `${wizardData.weightPreset ? weightMap[wizardData.weightPreset] : 5}kg`,
          amount: wizardData.budgetEstimate || 5000,
          createdAt: new Date().toISOString(),
          pickupH3Cell: pickupCell,
          dropoffH3Cell: dropoffCell,
          riderId: null
        });
      }

      // Success, route back to map
      navigateTo('command_map');

    } catch (error) {
      console.error("Failed to checkout:", error);
      alert("Checkout failed. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-surface-bright">
        <div>
          <h2 className="text-xl font-bold text-text tracking-tight">New Booking</h2>
          <p className="text-sm text-text-muted">Step {wizardStep} of 4</p>
        </div>
        <button
          onClick={() => navigateTo('command_map')}
          className="text-text-muted hover:text-error transition-colors cursor-pointer"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={wizardStep} />

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface-dim flex">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(wizardStep / 4) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={wizardStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto"
          >
            {wizardStep === 1 && <PickupDetails />}
            {wizardStep === 2 && <RecipientDetails />}
            {wizardStep === 3 && <PackageDetails />}
            {wizardStep === 4 && (
              <div className="text-center py-16 text-text-muted">
                <span className="material-symbols-outlined text-4xl mb-4">credit_card</span>
                <p className="text-lg font-semibold">Checkout</p>
                <p className="text-sm mt-2">Mock Payment - Funds go to escrow</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border p-4 bg-surface-bright flex justify-between items-center">
        <Button
          variant="ghost"
          size="md"
          icon="arrow_back"
          onClick={wizardStep === 1 ? () => navigateTo('command_map') : handleBack}
          disabled={isSubmitting}
        >
          {wizardStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="primary"
          size="md"
          icon={wizardStep === 4 ? undefined : 'arrow_forward'}
          onClick={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : (wizardStep === 4 ? 'Confirm & Pay' : 'Next Step')}
        </Button>
      </div>
    </div>
  );
}