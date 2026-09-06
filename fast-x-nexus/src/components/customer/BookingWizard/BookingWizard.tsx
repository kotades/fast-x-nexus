'use client';

/**
 * BookingWizard — Full Booking Orchestrator
 *
 * 4-step wizard with AnimatePresence slide transitions.
 * Step 1: Pickup Details (Sender + Geo)
 * Step 2: Recipient Details (Receiver + Geo)
 * Step 3: Package Details
 * Step 4: Checkout & Escrow Lock
 * 
 * Includes "Recent Booking Quick Summary" mode with 1-click "+ New Booking".
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Button } from '@/components/customer/ui/Button';
import { StepIndicator } from './StepIndicator';
import { PickupDetails } from './PickupDetails';
import { RecipientDetails } from './RecipientDetails';
import { PackageDetails } from './PackageDetails';
import { resolveAddressCascading, isWithinNigeria } from '@/lib/geo/cascadingGeocoder';
import { createCustomerOrderAction } from '@/app/actions/order';
import { FeedbackModal, type FeedbackType } from '@/components/ui/FeedbackModal';
import { deriveDualPins } from '@/lib/dispatch/pins';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

export function BookingWizard() {
  const {
    wizardStep,
    setWizardStep,
    navigateTo,
    wizardData,
    setActiveShipment,
    setActiveDeliveriesCount,
    lastCompletedBooking,
    setLastCompletedBooking,
    showBookingForm,
    setShowBookingForm,
    createNewBooking,
  } = useCustomerDashboard();

  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string | null;
    type: FeedbackType;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: null,
    type: 'error',
  });

  const handleNext = async () => {
    if (wizardStep < 4) {
      setDirection(1);
      setWizardStep((wizardStep + 1) as any);
    } else if (wizardStep === 4) {
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
      let pickupCoords = wizardData.pickupCoords;
      if (!pickupCoords && wizardData.pickupAddress) {
        try {
          const res = await resolveAddressCascading(wizardData.pickupAddress);
          if (res && isWithinNigeria(res.lat, res.lng)) {
            pickupCoords = { lat: res.lat, lng: res.lng };
          }
        } catch (geoErr) {
          console.warn('[handleCheckout] Pickup geocode warning:', geoErr);
        }
      }

      let dropoffCoords = wizardData.dropoffCoords;
      if (!dropoffCoords && wizardData.dropoffAddress) {
        try {
          const res = await resolveAddressCascading(wizardData.dropoffAddress);
          if (res && isWithinNigeria(res.lat, res.lng)) {
            dropoffCoords = { lat: res.lat, lng: res.lng };
          }
        } catch (geoErr) {
          console.warn('[handleCheckout] Dropoff geocode warning:', geoErr);
        }
      }

      const res = await createCustomerOrderAction({
        pickupName: wizardData.pickupName,
        pickupPhone: wizardData.pickupPhone,
        pickupAddress: wizardData.pickupAddress,
        pickupCoords,
        dropoffName: wizardData.dropoffName,
        dropoffPhone: wizardData.dropoffPhone,
        dropoffAddress: wizardData.dropoffAddress,
        dropoffCoords,
        preferredDeliveryTime: wizardData.preferredDeliveryTime,
        itemDescription: wizardData.itemDescription,
        weightPreset: wizardData.weightPreset,
        budgetEstimate: wizardData.budgetEstimate,
      });

      if (!res.success) {
        setFeedbackModal({
          isOpen: true,
          title: 'Checkout & Dispatch Failed',
          message: res.error || 'Failed to dispatch order. Please verify connectivity and try again.',
          details: `Error Code: DISPATCH_FAILED\nReason: ${res.error}\nTimestamp: ${new Date().toISOString()}`,
          type: 'error',
          confirmLabel: 'Retry Checkout',
        });
        return;
      }

      const { order, trackingCode } = res.data;

      const weightMap = {
        document: 1,
        small_box: 5,
        medium_box: 15,
      };

      const finalTrackingCode = trackingCode || `FX-${order.id.slice(0, 8).toUpperCase()}`;
      const { pickupPin, deliveryPin } = deriveDualPins(order.id, order.metadata);
      const orderAmount = Number(order.total_amount) || wizardData.budgetEstimate || 5000;

      if (setActiveShipment) {
        setActiveShipment({
          id: order.id,
          trackingCode: finalTrackingCode,
          status: order.status || 'PAID_UNASSIGNED',
          origin: wizardData.pickupAddress,
          destination: wizardData.dropoffAddress,
          progress: 20,
          weight: `${wizardData.weightPreset ? weightMap[wizardData.weightPreset] : 5}kg`,
          amount: orderAmount,
          createdAt: new Date().toISOString(),
          pickupH3Cell: order.pickup_h3_cell,
          dropoffH3Cell: order.dropoff_h3_cell,
          riderId: null,
        });
      }

      if (setLastCompletedBooking) {
        setLastCompletedBooking({
          id: order.id,
          orderId: order.id,
          trackingCode: finalTrackingCode,
          status: order.status || 'PAID_UNASSIGNED',
          pickupAddress: wizardData.pickupAddress,
          dropoffAddress: wizardData.dropoffAddress,
          pickupName: wizardData.pickupName,
          dropoffName: wizardData.dropoffName,
          itemDescription: wizardData.itemDescription,
          amount: orderAmount,
          pickupPin,
          deliveryPin,
          createdAt: new Date().toISOString(),
        });
      }

      if (setShowBookingForm) {
        setShowBookingForm(false);
      }

      setActiveDeliveriesCount((prev) => prev + 1);

      // Success, route back to map
      navigateTo('command_map');
    } catch (error: any) {
      console.error('Failed to checkout:', error);
      setFeedbackModal({
        isOpen: true,
        title: 'Connection / Checkout Error',
        message:
          error?.message ||
          'Failed to communicate with Fast X dispatch servers. Please check your internet connection.',
        details: `${error?.name || 'Error'}: ${error?.message || String(error)}\nStack: ${error?.stack || 'N/A'}`,
        type: 'error',
        confirmLabel: 'Retry Checkout',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RECENT BOOKING QUICK DATA CARD (When user visits BOOKINGS & an order exists)
  // ─────────────────────────────────────────────────────────────────────────────
  if (lastCompletedBooking && !showBookingForm) {
    const orderRef = lastCompletedBooking.id || lastCompletedBooking.orderId || '';
    const pickupPin = lastCompletedBooking.pickupPin || deriveDualPins(orderRef).pickupPin;

    return (
      <div className="h-full flex flex-col bg-surface overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto w-full space-y-5 my-auto">
          {/* Main Card */}
          <div className="bg-white border border-slate-200 border-l-[4px] border-l-[#347227] p-6 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#347227]">
                    ACTIVE SHIPMENT / RECENT BOOKING
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#347227] border border-emerald-200">
                    {lastCompletedBooking.status.replace('_', ' ')}
                  </span>
                </div>
                <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900">
                  {lastCompletedBooking.trackingCode}
                </h1>
              </div>

              {/* Prominent Action: + New Booking */}
              <button
                type="button"
                onClick={createNewBooking}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#347227] hover:bg-[#2b5e20] text-white font-bold text-sm rounded-lg shadow-sm transition-all cursor-pointer select-none"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Create New Booking</span>
              </button>
            </div>

            {/* Route Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs font-sans">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-[#347227] mb-1.5">
                  <span className="material-symbols-outlined text-sm">trip_origin</span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pickup Location
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-0.5">{lastCompletedBooking.pickupName || 'Sender Contact'}</p>
                <p className="text-slate-600 text-xs leading-relaxed truncate" title={lastCompletedBooking.pickupAddress}>
                  {lastCompletedBooking.pickupAddress}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-amber-600 mb-1.5">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Delivery Dropoff
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-0.5">{lastCompletedBooking.dropoffName || 'Recipient Contact'}</p>
                <p className="text-slate-600 text-xs leading-relaxed truncate" title={lastCompletedBooking.dropoffAddress}>
                  {lastCompletedBooking.dropoffAddress}
                </p>
              </div>
            </div>

            {/* Cargo & Escrow Data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Package Cargo</span>
                <span className="font-bold text-slate-800 text-xs">
                  {lastCompletedBooking.itemDescription || 'Standard Parcel'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Escrow Protected GMV</span>
                <span className="font-bold font-mono text-[#347227] text-sm">
                  ₦{lastCompletedBooking.amount.toLocaleString('en-NG')}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Dispatched Time</span>
                <span className="font-medium text-slate-700 text-xs">
                  {new Date(lastCompletedBooking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(lastCompletedBooking.createdAt).toLocaleDateString()})
                </span>
              </div>
            </div>

            {/* Handover Security PINs */}
            <div className="mt-5 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[#347227] mb-0.5">
                  <span className="material-symbols-outlined text-base">pin</span>
                  <span className="text-xs font-black uppercase tracking-wider">Proof of Pickup (POP) PIN</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Disclose this 4-digit code to the courier upon physical parcel handover.
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="px-3 py-1.5 bg-white border border-emerald-300 rounded font-mono font-black text-lg tracking-widest text-[#347227] shadow-xs">
                  {pickupPin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pickupPin);
                    setCopiedPin(pickupPin);
                    setTimeout(() => setCopiedPin(null), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-[#347227] text-slate-700 hover:text-[#347227] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedPin === pickupPin ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedPin === pickupPin ? 'Copied' : 'Copy PIN'}</span>
                </button>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigateTo('command_map')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-slate-300"
              >
                <span className="material-symbols-outlined text-[16px]">radar</span>
                <span>Track Live on Radar</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('activity_ledger')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#347227] hover:bg-emerald-50/60 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span>View All Orders in History</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4-STEP WIZARD FORM (Wide responsive container, fits with zero scrolling)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center bg-surface-bright shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-text tracking-tight uppercase">New Booking</h2>
            <p className="text-[11px] sm:text-xs text-text-muted font-mono">Step {wizardStep} of 4</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastCompletedBooking && (
            <button
              type="button"
              onClick={() => setShowBookingForm(false)}
              className="text-xs font-bold text-text-muted hover:text-text px-2 py-1 rounded border border-border hover:border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              <span className="hidden sm:inline">Recent Booking</span>
            </button>
          )}

          <button
            onClick={() => navigateTo('command_map')}
            className="text-text-muted hover:text-error transition-colors cursor-pointer p-1"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={wizardStep}
        onStepClick={(step) => {
          setDirection(step < wizardStep ? -1 : 1);
          setWizardStep(step);
        }}
      />

      {/* Progress Bar */}
      <div className="w-full h-1 bg-surface-dim flex shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${(wizardStep / 4) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col justify-start sm:justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={wizardStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto w-full"
          >
            {wizardStep === 1 && <PickupDetails />}
            {wizardStep === 2 && <RecipientDetails />}
            {wizardStep === 3 && <PackageDetails />}
            {wizardStep === 4 && (
              <div className="space-y-4 font-sans">
                <div className="bg-white border border-slate-200 border-l-[4px] border-l-[#347227] p-5 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3.5">
                    <div>
                      <p className="text-[10px] font-mono font-black tracking-widest text-[#347227] uppercase">
                        [DISPATCH VERIFICATION]
                      </p>
                      <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                        Order & Escrow Summary
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-[#347227] font-mono text-[10px] font-black uppercase rounded">
                      Ready to Dispatch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Origin */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-1.5 text-[#347227] mb-1">
                        <span className="material-symbols-outlined text-sm">trip_origin</span>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Pickup Location
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 truncate">{wizardData.pickupName || 'Sender Contact'}</p>
                      <p className="text-slate-600 text-[11px] truncate">{wizardData.pickupAddress || 'No address specified'}</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">{wizardData.pickupPhone || 'N/A'}</p>
                    </div>

                    {/* Destination */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Delivery Dropoff
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 truncate">{wizardData.dropoffName || 'Recipient Contact'}</p>
                      <p className="text-slate-600 text-[11px] truncate">{wizardData.dropoffAddress || 'No address specified'}</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">{wizardData.dropoffPhone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Cargo Spec & Price */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">Cargo Spec: </span>
                      <span className="text-xs font-bold text-slate-800 uppercase">
                        {wizardData.weightPreset ? wizardData.weightPreset.replace('_', ' ') : 'Standard'} (
                        {wizardData.itemDescription || 'General Cargo'})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">Escrow Protected GMV</span>
                      <span className="text-base font-black font-mono text-[#347227]">
                        ₦{(wizardData.budgetEstimate || 5000).toLocaleString('en-NG')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="material-symbols-outlined text-base text-[#347227] flex-shrink-0 mt-0.5">verified_user</span>
                  <p className="leading-relaxed font-sans text-[11px]">
                    Fast X Escrow Lock: Courier payout remains securely escrowed until recipient confirms receipt with the 4-digit Proof of Delivery PIN.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border px-4 sm:px-6 py-2.5 sm:py-3.5 bg-surface-bright flex justify-between items-center shrink-0">
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
          {isSubmitting ? 'Processing...' : (wizardStep === 4 ? `Confirm & Pay ₦${(wizardData.budgetEstimate || 5000).toLocaleString('en-NG')}` : 'Next Step')}
        </Button>
      </div>

      {/* Industrial Feedback & Error Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        message={feedbackModal.message}
        details={feedbackModal.details}
        type={feedbackModal.type}
        confirmLabel={feedbackModal.confirmLabel}
        onConfirm={async () => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
          await handleCheckout();
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
}