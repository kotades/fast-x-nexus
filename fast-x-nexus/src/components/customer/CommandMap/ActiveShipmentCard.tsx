'use client';

/**
 * /src/components/customer/CommandMap/ActiveShipmentCard.tsx
 * Fast X Nexus — Pinned Bottom-Left Shipment Tracker with One-Click Delete
 *
 * Glass panel card showing active routing details with animated progress.
 * Includes interactive DELETE / CANCEL order button for instant sandbox resetting.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/customer/ui/Badge';
import { Button } from '@/components/customer/ui/Button';
import { deleteOrderAction } from '@/app/actions/order';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { createBrowserClient } from '@/lib/supabase/client';
import { resolveAddressCascading, type ResolvedLocation } from '@/lib/geo/cascadingGeocoder';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';
import { FeedbackModal, type FeedbackType } from '@/components/ui/FeedbackModal';
import { deriveDualPins } from '@/lib/dispatch/pins';

interface ActiveShipmentCardProps {
  shipment: Shipment;
  pickupResolution?: ResolvedLocation | null;
  dropoffResolution?: ResolvedLocation | null;
  riderCoords?: { lat: number; lng: number } | null;
  onDetails?: () => void;
  onIntercept?: () => void;
}

// Great-circle haversine distance
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Estimated driving time in Lagos traffic (avg 25 km/h)
function estimateDrivingMinutes(distanceKm: number): number {
  return Math.max(2, Math.round((distanceKm / 25) * 60));
}

function getBadgeVariant(status: Shipment['status']) {
  switch (status) {
    case 'PLACED': return 'warning' as const;
    case 'PAID_UNASSIGNED': return 'warning' as const;
    case 'ASSIGNED': return 'primary' as const;
    case 'PICKED_UP': return 'primary' as const;
    case 'IN_TRANSIT': return 'primary' as const;
    case 'DELIVERED': return 'success' as const;
    case 'CANCELLED': return 'error' as const;
  }
}

function getStatusLabel(status: Shipment['status']) {
  switch (status) {
    case 'PLACED': return 'Placed';
    case 'PAID_UNASSIGNED': return 'Matching Courier';
    case 'ASSIGNED': return 'Courier En Route';
    case 'PICKED_UP': return 'In Transit';
    case 'IN_TRANSIT': return 'In Transit';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
  }
}

export function ActiveShipmentCard({ shipment, pickupResolution, dropoffResolution, riderCoords, onDetails, onIntercept }: ActiveShipmentCardProps) {
  const { setActiveShipment, setActiveDeliveriesCount } = useCustomerDashboard();
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: FeedbackType;
    confirmLabel?: string;
    onConfirm?: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
  });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [internalPickupRes, setInternalPickupRes] = useState<ResolvedLocation | null>(null);
  const [internalDropoffRes, setInternalDropoffRes] = useState<ResolvedLocation | null>(null);
  const [riderProfile, setRiderProfile] = useState<{
    name?: string;
    phone?: string;
    vehicle?: string;
    plate?: string;
  } | null>(null);

  const supabase = createBrowserClient();

  // Resolve waypoints if not passed via props
  useEffect(() => {
    if (pickupResolution) {
      setInternalPickupRes(pickupResolution);
    } else if (shipment.origin) {
      resolveAddressCascading(shipment.origin).then(setInternalPickupRes).catch(() => {});
    }

    if (dropoffResolution) {
      setInternalDropoffRes(dropoffResolution);
    } else if (shipment.destination) {
      resolveAddressCascading(shipment.destination).then(setInternalDropoffRes).catch(() => {});
    }
  }, [shipment.origin, shipment.destination, pickupResolution, dropoffResolution]);

  // Fetch Courier Details if rider is assigned
  useEffect(() => {
    if (!shipment.riderId) {
      setRiderProfile(null);
      return;
    }

    async function fetchRiderInfo() {
      const { data } = await supabase
        .from('profiles')
        .select('whatsapp_contact, metadata')
        .eq('id', shipment.riderId)
        .single();

      if (data) {
        const meta = (data.metadata as any) || {};
        setRiderProfile({
          name: meta.full_name || 'Fast X Fleet Courier',
          phone: data.whatsapp_contact || meta.phone || '+2348000000000',
          vehicle: meta.vehicle_type ? meta.vehicle_type.toUpperCase() : 'MOTORCYCLE',
          plate: meta.vehicle_plate || 'FX-DISPATCH',
        });
      }
    }

    fetchRiderInfo();
  }, [shipment.riderId, supabase]);

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const performDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteOrderAction(shipment.id);
      if (res.success) {
        if (setActiveShipment) setActiveShipment(null);
        if (setActiveDeliveriesCount) setActiveDeliveriesCount((prev) => Math.max(0, prev - 1));
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Cancellation Failed',
          message: res.error || 'Failed to cancel booking.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        title: 'System Error',
        message: err.message || 'Error cancelling booking.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    setFeedbackModal({
      isOpen: true,
      title: 'Cancel Shipment',
      message: `Are you sure you want to cancel and delete active delivery ${shipment.trackingCode}? This will immediately release any assigned courier.`,
      type: 'confirm',
      confirmLabel: 'Cancel Booking',
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        await performDelete();
      },
    });
  };

  const { pickupPin, deliveryPin } = deriveDualPins(shipment.id);

  // Proximity to pickup or dropoff destination
  const isPickedUp = shipment.status === 'PICKED_UP' || shipment.status === 'IN_TRANSIT';
  const targetWaypointCoords = isPickedUp
    ? (dropoffResolution || internalDropoffRes)
    : (pickupResolution || internalPickupRes);

  let riderProximity: { distanceKm: number; etaMinutes: number; label: string } | null = null;
  if (riderCoords && targetWaypointCoords) {
    const distanceKm = calculateDistanceKm(
      riderCoords.lat,
      riderCoords.lng,
      targetWaypointCoords.lat,
      targetWaypointCoords.lng
    );
    const etaMinutes = estimateDrivingMinutes(distanceKm);
    riderProximity = {
      distanceKm,
      etaMinutes,
      label: isPickedUp ? 'Distance to Dropoff' : 'Distance to Pickup',
    };
  }

  return (
    <div className="absolute bottom-3 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-auto z-20 pointer-events-none max-w-md sm:w-full">
      {/* Sleek Tactile Drag Handle Pill to Toggle Expand / Collapse */}
      <div className="flex justify-center -mb-2 relative z-20 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3.5 py-1 bg-surface-elevated/95 backdrop-blur-md border border-border border-b-0 rounded-t-lg shadow-sm text-[9px] font-black uppercase tracking-wider text-text-muted hover:text-primary flex items-center gap-1 transition-all cursor-pointer select-none"
          aria-label={isCollapsed ? 'Expand route details' : 'Collapse route details'}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isCollapsed ? 'expand_less' : 'expand_more'}
          </span>
          <span>
            {isCollapsed ? 'TAP TO EXPAND ROUTE DETAILS' : 'TAP TO MINIMIZE TO MAP'}
          </span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 250,
          mass: 0.9,
        }}
        className="pointer-events-auto w-full max-h-[calc(100vh-140px)] overflow-y-auto bg-surface-elevated/95 backdrop-blur-xl border border-border border-l-4 border-l-primary shadow-2xl font-mono text-text p-3 sm:p-4"
      >
        {/* Header */}
        <div className={`flex justify-between items-center gap-2 ${isCollapsed ? 'mb-0' : 'mb-3'}`}>
          <div 
            className="cursor-pointer select-none"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title="Click to toggle details"
          >
            <p className="text-[9px] text-primary uppercase font-black tracking-wider">
              Active Waybill
            </p>
            <h2 className="text-sm sm:text-base font-black text-text tracking-tight font-mono">
              {shipment.trackingCode}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={getBadgeVariant(shipment.status)}>
              {getStatusLabel(shipment.status)}
            </Badge>
            {isCollapsed && (
              <button
                onClick={onDetails}
                className="px-2 py-1 bg-surface-dim hover:bg-surface border border-border text-[9px] font-black uppercase tracking-wider text-text cursor-pointer transition-colors"
              >
                Details
              </button>
            )}
          </div>
        </div>

      {/* Collapsible Card Body */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Route Timeline */}
            {(() => {
              const pRes = pickupResolution || internalPickupRes;
              const dRes = dropoffResolution || internalDropoffRes;
              const isPickupApprox = pRes ? pRes.isEstimatedVicinity : false;
              const isDropoffApprox = dRes ? dRes.isEstimatedVicinity : false;

              return (
                <div className="bg-surface-low border border-border p-2.5 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5" aria-hidden="true">
                      radio_button_checked
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-text truncate" title={shipment.origin}>
                        {shipment.origin}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] text-text-muted">Origin / Pickup</p>
                        {isPickupApprox ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                            Approx Area (±{pRes?.accuracyRadius || 180}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                            Verified Street (±{pRes?.accuracyRadius || 35}m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-[6px] border-l-2 border-dashed border-border h-3" />

                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-sm mt-0.5" aria-hidden="true">
                      location_on
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-text truncate" title={shipment.destination}>
                        {shipment.destination}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] text-text-muted">Destination / Dropoff</p>
                        {isDropoffApprox ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                            Approx Area (±{dRes?.accuracyRadius || 180}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                            Verified Street (±{dRes?.accuracyRadius || 35}m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-text-muted mb-1">
                <span>Lifecycle Progress</span>
                <span className="font-bold text-primary">{shipment.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-low border border-border overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${shipment.progress}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>

            {/* Stage 1: Pickup POP Custody PIN */}
            {shipment.status === 'ASSIGNED' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
              >
                <div>
                  <p className="text-[9px] uppercase font-black text-amber-700">Stage 1: Pickup PIN (POP)</p>
                  <p className="text-[9px] text-amber-900/80">Share with rider at parcel handoff</p>
                </div>
                <button
                  onClick={() => handleCopyPin(pickupPin)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-amber-500/40 hover:border-amber-600 transition-colors cursor-pointer group"
                >
                  <span className="text-base font-black tracking-widest text-amber-700 font-mono">
                    {pickupPin}
                  </span>
                  <span className="material-symbols-outlined text-xs text-amber-600 group-hover:text-amber-800">
                    {copiedPin === pickupPin ? 'check' : 'content_copy'}
                  </span>
                </button>
              </motion.div>
            )}

            {/* Stage 2: Delivery POD Custody PIN */}
            {['PICKED_UP', 'IN_TRANSIT'].includes(shipment.status) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between"
              >
                <div>
                  <p className="text-[9px] uppercase font-black text-emerald-700">Stage 2: Delivery PIN (POD)</p>
                  <p className="text-[9px] text-emerald-900/80">Share upon parcel delivery</p>
                </div>
                <button
                  onClick={() => handleCopyPin(deliveryPin)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-emerald-500/40 hover:border-emerald-600 transition-colors cursor-pointer group"
                >
                  <span className="text-base font-black tracking-widest text-emerald-700 font-mono">
                    {deliveryPin}
                  </span>
                  <span className="material-symbols-outlined text-xs text-emerald-600 group-hover:text-emerald-800">
                    {copiedPin === deliveryPin ? 'check' : 'content_copy'}
                  </span>
                </button>
              </motion.div>
            )}

            {/* Assigned Courier Contact Card with Proximity & ETA */}
            {riderProfile && (
              <div className="mb-3 p-2.5 bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">two_wheeler</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-text leading-tight">{riderProfile.name}</p>
                      <p className="text-[9px] text-text-muted">{riderProfile.vehicle} • {riderProfile.plate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {riderProfile.phone && (
                      <a
                        href={`https://wa.me/${riderProfile.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] transition-colors"
                        title="Message Courier on WhatsApp"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                      </a>
                    )}
                    {riderProfile.phone && (
                      <a
                        href={`tel:${riderProfile.phone}`}
                        className="p-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary transition-colors"
                        title="Call Courier"
                      >
                        <span className="material-symbols-outlined text-sm">call</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Real-time Distance & Estimated Time to Pickup / Dropoff */}
                {riderProximity ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        {riderProximity.label}:
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-900 text-xs">
                      {riderProximity.distanceKm} km (~{riderProximity.etaMinutes} mins)
                    </span>
                  </div>
                ) : (
                  <div className="bg-surface-low border border-border p-1.5 text-[9px] text-text-muted flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-primary animate-spin">sync</span>
                    <span>Syncing courier live telemetry...</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" fullWidth onClick={onDetails}>
                VIEW DETAILS
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-colors cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Industrial Feedback & Confirmation Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
        confirmLabel={feedbackModal.confirmLabel}
        onConfirm={feedbackModal.onConfirm}
        isLoading={isDeleting}
      />
      </motion.div>
    </div>
  );
}