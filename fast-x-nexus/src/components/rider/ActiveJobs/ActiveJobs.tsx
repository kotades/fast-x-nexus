'use client';

/**
 * /src/components/rider/ActiveJobs/ActiveJobs.tsx
 * Fast X Nexus — Enterprise Active Waybill & Dual-PIN Custody Console
 *
 * Implements full Dual-PIN Chain of Custody lifecycle:
 * 1. Stage 1 — Proof of Pickup (POP): 4-Digit Sender PIN Verification -> PICKED_UP
 * 2. Stage 2 — Proof of Delivery (POD): 4-Digit Recipient PIN Verification -> DELIVERED
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion } from 'framer-motion';
import { getActiveRiderJobs, pickupJob, completeDeliveryWithPin } from '@/app/actions/rider';
import { EmptyState } from '@/components/customer/shared/EmptyState';
import { Skeleton } from '@/components/customer/shared/Skeleton';

function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1);
  }
  return cleaned;
}

function formatTelPhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

export function ActiveJobs() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupPinInput, setPickupPinInput] = useState<Record<string, string>>({});
  const [deliveryPinInput, setDeliveryPinInput] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const fetchActive = async () => {
    setLoading(true);
    const res = await getActiveRiderJobs();
    if (res.success && res.data) {
      setActiveJobs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const handlePickupWithPin = (orderId: string) => {
    const pin = pickupPinInput[orderId];
    if (!pin) {
      setFeedback((prev) => ({ ...prev, [orderId]: '❌ Please enter the sender 4-digit Pickup PIN.' }));
      return;
    }

    startTransition(async () => {
      const res = await pickupJob(orderId, pin);
      if (res.success) {
        setFeedback((prev) => ({ ...prev, [orderId]: '✅ Cargo picked up and verified! Proceed to dropoff destination.' }));
        fetchActive();
      } else {
        setFeedback((prev) => ({ ...prev, [orderId]: `❌ ${res.error}` }));
      }
    });
  };

  const handleCompleteWithPin = (orderId: string) => {
    const pin = deliveryPinInput[orderId];
    if (!pin) {
      setFeedback((prev) => ({ ...prev, [orderId]: '❌ Please enter the recipient Delivery PIN.' }));
      return;
    }

    startTransition(async () => {
      const res = await completeDeliveryWithPin(orderId, pin);
      if (res.success) {
        setFeedback((prev) => ({ ...prev, [orderId]: '🎉 Delivery confirmed! Payout credited to your earnings.' }));
        setTimeout(() => fetchActive(), 1000);
      } else {
        setFeedback((prev) => ({ ...prev, [orderId]: `❌ ${res.error}` }));
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 font-mono">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon="local_shipping"
          title="No Active Deliveries"
          description="Claim an available job from the Job Pool to begin your dispatch route."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 font-mono">
      <div className="border-b border-border pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
          OPERATIONS / ACTIVE WAYBILLS
        </p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-text">
          Active Deliveries ({activeJobs.length})
        </h1>
      </div>

      <div className="space-y-6">
        {activeJobs.map((job) => {
          const isPickedUp = job.status === 'PICKED_UP' || job.status === 'IN_TRANSIT';
          const riderPayout = Math.round((Number(job.total_amount) || 0) * 0.7);
          const progressPercent = isPickedUp ? 75 : 35;
          const msg = feedback[job.id];

          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-border border-l-4 border-l-primary p-5 space-y-5 shadow-sm"
            >
              {/* Header & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <span className="text-xs font-black text-primary uppercase tracking-wider">
                    WAYBILL FX-{job.id.substring(0, 8).toUpperCase()}
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Assigned at {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-emerald-600">
                    ₦{riderPayout.toLocaleString('en-NG')}
                  </span>
                  <span className={`px-2.5 py-1 border text-[10px] font-black uppercase tracking-wider ${
                    isPickedUp
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}>
                    {isPickedUp ? 'EN ROUTE TO DROPOFF' : 'HEADING TO PICKUP'}
                  </span>
                </div>
              </div>

              {/* Progress Spring Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-text-muted">
                  <span>Lifecycle Custody Progress</span>
                  <span className="text-primary font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-surface-low border border-border overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-text-dim uppercase">
                  <span>1. Claimed</span>
                  <span className={isPickedUp ? 'font-bold text-primary' : ''}>2. Cargo Picked Up</span>
                  <span>3. Delivered</span>
                </div>
              </div>

              {/* Waypoints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Pickup Details (Origin) */}
                <div className="bg-surface-low border border-border p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-text-dim text-[10px] uppercase font-black font-mono">
                      <span className="material-symbols-outlined text-xs text-primary">radio_button_checked</span>
                      Pickup Details (Origin)
                    </div>
                  </div>
                  <p className="text-text font-bold text-xs leading-snug">{job.pickup_address || 'Lagos Hub'}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-text-muted">
                      Contact: <span className="font-semibold text-text">{job.pickup_name || 'Sender'}</span> ({job.pickup_phone || 'N/A'})
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.pickup_phone ? (
                        <>
                          <a
                            href={`https://wa.me/${formatWhatsAppPhone(job.pickup_phone)}?text=${encodeURIComponent(
                              `Hello ${job.pickup_name || 'Sender'}, I am your Fast X Courier for waybill FX-${job.id.slice(0, 8).toUpperCase()}. I am en route to pick up your parcel.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10.5px] font-bold shadow-xs transition-colors cursor-pointer font-sans"
                            title={`Message ${job.pickup_name || 'sender'} on WhatsApp`}
                          >
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${formatTelPhone(job.pickup_phone)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10.5px] font-bold shadow-xs transition-colors cursor-pointer font-sans"
                            title={`Call ${job.pickup_name || 'sender'}`}
                          >
                            <span className="material-symbols-outlined text-[13px] text-primary">call</span>
                            <span>Call</span>
                          </a>
                        </>
                      ) : (
                        <span className="text-[10px] text-text-dim font-mono">No phone set</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropoff Details (Destination) */}
                <div className="bg-surface-low border border-border p-3.5 space-y-2">
                  {isPickedUp ? (
                    <>
                      <div className="flex items-center gap-1.5 text-text-dim text-[10px] uppercase font-black font-mono">
                        <span className="material-symbols-outlined text-xs text-emerald-600">location_on</span>
                        Dropoff Details (Destination)
                      </div>
                      <p className="text-text font-bold text-xs leading-snug">{job.dropoff_address || 'Dropoff Hub'}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-text-muted">
                          Recipient: <span className="font-semibold text-text">{job.dropoff_name || 'Recipient'}</span> ({job.dropoff_phone || 'N/A'})
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {job.dropoff_phone ? (
                            <>
                              <a
                                href={`https://wa.me/${formatWhatsAppPhone(job.dropoff_phone)}?text=${encodeURIComponent(
                                  `Hello ${job.dropoff_name || 'Recipient'}, I am your Fast X Courier for waybill FX-${job.id.slice(0, 8).toUpperCase()}. I have picked up your package and am heading to your dropoff location.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10.5px] font-bold shadow-xs transition-colors cursor-pointer font-sans"
                                title={`Message ${job.dropoff_name || 'recipient'} on WhatsApp`}
                              >
                                <span className="material-symbols-outlined text-[13px] text-emerald-600">chat</span>
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={`tel:${formatTelPhone(job.dropoff_phone)}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10.5px] font-bold shadow-xs transition-colors cursor-pointer font-sans"
                                title={`Call ${job.dropoff_name || 'recipient'}`}
                              >
                                <span className="material-symbols-outlined text-[13px] text-primary">call</span>
                                <span>Call</span>
                              </a>
                            </>
                          ) : (
                            <span className="text-[10px] text-text-dim font-mono">No phone set</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-amber-600 text-[10px] uppercase font-black font-mono">
                        <span className="material-symbols-outlined text-xs">lock</span>
                        Dropoff Details (Gated)
                      </div>
                      <p className="text-text-muted font-bold text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs" aria-hidden="true">lock</span>
                        <span>Confidential Destination</span>
                      </p>
                      <p className="text-[10px] text-text-dim">Unlocks upon Stage 1 Pickup PIN verification</p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50 opacity-40 select-none">
                        <p className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
                          <span className="material-symbols-outlined text-[12px] text-amber-600">lock</span>
                          Recipient: Gated
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded text-[10.5px] font-bold cursor-not-allowed font-sans"
                            title="Dropoff contact unlocks after Stage 1 Pickup PIN verification"
                          >
                            <span className="material-symbols-outlined text-[13px]">lock</span>
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded text-[10.5px] font-bold cursor-not-allowed font-sans"
                            title="Dropoff contact unlocks after Stage 1 Pickup PIN verification"
                          >
                            <span className="material-symbols-outlined text-[13px]">lock</span>
                            <span>Call</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {msg && (
                <div className="p-3 bg-surface-low border border-border text-xs text-text">
                  {msg}
                </div>
              )}

              {/* Action Stage: Dual PIN Protocol */}
              <div className="border-t border-border pt-4">
                {!isPickedUp ? (
                  /* STAGE 1: PROOF OF PICKUP (POP) */
                  <div className="space-y-3 bg-amber-500/5 border border-amber-500/30 p-4">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-amber-600 text-sm">inventory_2</span>
                      Stage 1: Proof of Pickup (POP) Verification
                    </div>
                    <p className="text-[10px] text-text-muted">
                      Ask {job.pickup_name || 'the sender'} for their 4-digit Pickup PIN upon receiving the cargo package.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="ENTER 4-DIGIT PICKUP PIN (e.g. 7421)"
                        value={pickupPinInput[job.id] || ''}
                        onChange={(e) => setPickupPinInput({ ...pickupPinInput, [job.id]: e.target.value })}
                        className="flex-1 bg-white border border-border text-text px-4 py-2.5 text-xs font-mono tracking-widest text-center uppercase focus:outline-none focus:border-primary min-h-[44px]"
                      />
                      <button
                        onClick={() => handlePickupWithPin(job.id)}
                        disabled={isPending}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-mono font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md min-h-[44px] flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">inventory_2</span>
                        <span>{isPending ? 'VERIFYING...' : 'CONFIRM PICKUP & START ROUTE →'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STAGE 2: PROOF OF DELIVERY (POD) */
                  <div className="space-y-3 bg-emerald-500/5 border border-emerald-500/30 p-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                      Stage 2: Proof of Delivery (POD) Verification
                    </div>
                    <p className="text-[10px] text-text-muted">
                      Request the 4-digit Delivery PIN from {job.dropoff_name || 'the recipient'} upon parcel handover.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="ENTER 4-DIGIT DELIVERY PIN (e.g. 8492)"
                        value={deliveryPinInput[job.id] || ''}
                        onChange={(e) => setDeliveryPinInput({ ...deliveryPinInput, [job.id]: e.target.value })}
                        className="flex-1 bg-white border border-border text-text px-4 py-2.5 text-xs font-mono tracking-widest text-center uppercase focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => handleCompleteWithPin(job.id)}
                        disabled={isPending}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        {isPending ? 'VERIFYING...' : 'CONFIRM DELIVERY & UNLOCK PAYOUT'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}