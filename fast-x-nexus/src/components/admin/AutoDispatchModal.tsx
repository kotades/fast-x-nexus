'use client';

/**
 * /src/components/admin/AutoDispatchModal.tsx
 * Fast X Nexus — 1-Click Batch Auto-Dispatch Preview & Confirmation Engine
 *
 * Industrial Control Tower interface allowing dispatchers to preview optimal
 * H3 nearest-courier pairings, inspect distances and courier payouts, deselect
 * edge cases, and execute atomic batch assignments with real-time feedback.
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  previewAutoDispatchAction,
  executeBatchAutoDispatchAction,
} from '@/app/actions/dispatch';
import type {
  DispatchPreviewResult,
  DispatchPreviewMatch,
} from '@/lib/dispatch/types';

interface AutoDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AutoDispatchModal({
  isOpen,
  onClose,
  onSuccess,
}: AutoDispatchModalProps) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<DispatchPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Set of selected orderIds for execution
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Execution transition & state
  const [isExecuting, startExecution] = useTransition();
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    allocatedCount: number;
    errors?: string[];
    message?: string;
  } | null>(null);

  // Tab state: 'matches' or 'unassigned'
  const [activeTab, setActiveTab] = useState<'matches' | 'unassigned'>('matches');

  // Fetch preview whenever modal opens
  useEffect(() => {
    if (isOpen) {
      loadPreview();
      setExecutionResult(null);
    } else {
      setPreviewData(null);
      setPreviewError(null);
      setSelectedOrderIds(new Set());
    }
  }, [isOpen]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await previewAutoDispatchAction({
        maxRadiusH3Krings: 6,
        allowMultiOrder: true,
        maxOrdersPerRider: 3,
      });

      if (res.success && res.data) {
        setPreviewData(res.data);
        // Pre-select all proposed matches
        setSelectedOrderIds(new Set(res.data.matches.map((m) => m.orderId)));
      } else {
        setPreviewError(res.error || 'Failed to generate dispatch preview');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Error communicating with dispatch orchestrator');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleSelect = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!previewData) return;
    if (selectedOrderIds.size === previewData.matches.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(previewData.matches.map((m) => m.orderId)));
    }
  };

  const handleConfirmBatchDispatch = () => {
    if (!previewData || selectedOrderIds.size === 0) return;

    const matchesToExecute = previewData.matches
      .filter((m) => selectedOrderIds.has(m.orderId))
      .map((m) => ({ orderId: m.orderId, riderId: m.riderId }));

    startExecution(async () => {
      const res = await executeBatchAutoDispatchAction(matchesToExecute);
      if (res.success) {
        setExecutionResult({
          success: true,
          allocatedCount: res.allocatedCount,
          message: `Successfully dispatched ${res.allocatedCount} waybills to designated couriers. Notifications broadcasted.`,
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setExecutionResult({
          success: false,
          allocatedCount: res.allocatedCount || 0,
          errors: res.errors,
          message: res.error || 'Batch dispatch encountered errors during assignment.',
        });
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Crisp Translucent Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isExecuting && onClose()}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 shadow-2xl rounded-lg flex flex-col overflow-hidden text-slate-900 z-10"
        >
          {/* Top Header Bar */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">bolt</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                    1-Click Batch Auto-Dispatch Engine
                  </h2>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                    Uber H3 Spatial Index
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal">
                  Matches pending cargo to optimal nearest couriers using spatial proximity and capacity load-balancing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPreview}
                disabled={loadingPreview || isExecuting}
                className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-run Spatial Match Engine"
              >
                <span className={`material-symbols-outlined text-sm ${loadingPreview ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span className="hidden sm:inline">Refresh Preview</span>
              </button>

              <button
                onClick={onClose}
                disabled={isExecuting}
                className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Metric Overview Strip */}
          {previewData && !loadingPreview && !executionResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-100/60 divide-x divide-slate-200 text-center font-mono">
              <div className="p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Pending Waybills
                </span>
                <span className="text-base font-black text-slate-900">
                  {previewData.totalOrders}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Matchable Pairs
                </span>
                <span className="text-base font-black text-emerald-700">
                  {previewData.matchedCount}
                </span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Avg Proximity
                </span>
                <span className="text-base font-black text-blue-700">
                  {previewData.avgDistanceKm} <span className="text-xs font-normal">km</span>
                </span>
              </div>
              <div className="p-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Courier Escrow
                </span>
                <span className="text-base font-black text-slate-900">
                  ₦{previewData.totalPayoutNgn.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Loading State */}
            {loadingPreview && (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
                <h3 className="text-sm font-bold text-slate-800">Calculating Spatial Allocations...</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Querying online couriers, evaluating H3 hexagonal ring distances, and load-balancing vehicle capacities across Lagos hubs.
                </p>
              </div>
            )}

            {/* Error State */}
            {previewError && !loadingPreview && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-base text-red-600">error</span>
                  Dispatch Calculation Error
                </div>
                <p className="text-xs mt-1 text-red-700">{previewError}</p>
                <button
                  onClick={loadPreview}
                  className="mt-3 px-3 py-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Retry Calculation
                </button>
              </div>
            )}

            {/* Execution Result Banner */}
            {executionResult && (
              <div
                className={`p-5 rounded-lg border mb-4 ${
                  executionResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      executionResult.success ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {executionResult.success ? 'check_circle' : 'warning'}
                  </span>
                  <span>
                    {executionResult.success ? 'Batch Dispatch Completed' : 'Partial Dispatch Warning'}
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed">{executionResult.message}</p>
                {executionResult.errors && executionResult.errors.length > 0 && (
                  <ul className="mt-2 text-xs list-disc list-inside text-red-600 font-mono">
                    {executionResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                  >
                    Return to Control Tower
                  </button>
                </div>
              </div>
            )}

            {/* Content Display when Preview is Ready */}
            {previewData && !loadingPreview && !executionResult && (
              <div>
                {/* Zero orders notice */}
                {previewData.totalOrders === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                      task_alt
                    </span>
                    <h3 className="text-sm font-bold text-slate-700">Dispatch Queue is Clear</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      No pending unassigned waybills currently await courier allocation.
                    </p>
                  </div>
                )}

                {/* Orders exist */}
                {previewData.totalOrders > 0 && (
                  <div>
                    {/* Navigation Tabs */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTab('matches')}
                          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                            activeTab === 'matches'
                              ? 'bg-primary text-white'
                              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                          }`}
                        >
                          Proposed Matches ({previewData.matchedCount})
                        </button>
                        <button
                          onClick={() => setActiveTab('unassigned')}
                          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                            activeTab === 'unassigned'
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                          }`}
                        >
                          Unmatchable ({previewData.unassignedCount})
                        </button>
                      </div>

                      {activeTab === 'matches' && previewData.matchedCount > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSelectAll}
                            className="text-xs font-mono font-bold text-primary hover:underline cursor-pointer"
                          >
                            {selectedOrderIds.size === previewData.matches.length
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-xs font-mono text-slate-600">
                            {selectedOrderIds.size} of {previewData.matchedCount} Selected
                          </span>
                        </div>
                      )}
                    </div>

                    {/* MATCHES VIEW */}
                    {activeTab === 'matches' && (
                      <div className="space-y-3">
                        {previewData.matches.length === 0 ? (
                          <div className="py-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded">
                            <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">
                              person_off
                            </span>
                            <p className="text-xs font-bold text-slate-700">No Eligible Courier Matches Found</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              No online couriers within search radius or all couriers have reached capacity.
                            </p>
                          </div>
                        ) : (
                          previewData.matches.map((match) => {
                            const isSelected = selectedOrderIds.has(match.orderId);

                            return (
                              <div
                                key={match.orderId}
                                onClick={() => handleToggleSelect(match.orderId)}
                                className={`p-4 border rounded-lg transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-white border-primary shadow-sm ring-1 ring-primary/20'
                                    : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-80'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  {/* Left: Checkbox + Waybill Details */}
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelect(match.orderId)}
                                      className="mt-1 h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                          {match.trackingNumber}
                                        </span>
                                        <span className="text-[11px] text-slate-500 font-mono">
                                          {match.cargoWeightKg}kg • {match.cargoDescription}
                                        </span>
                                      </div>

                                      {/* Route line */}
                                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                          <span className="text-slate-500 text-[11px] shrink-0">Pickup:</span>
                                          <span className="font-medium truncate">{match.pickupAddress}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                          <span className="text-slate-500 text-[11px] shrink-0">Dropoff:</span>
                                          <span className="font-medium truncate">{match.dropoffAddress}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Center: Spatial Metrics */}
                                  <div className="flex md:flex-col items-center justify-center gap-1 shrink-0 px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded font-mono text-center">
                                    <div className="flex items-center gap-1 text-xs font-black text-blue-800">
                                      <span className="material-symbols-outlined text-xs">near_me</span>
                                      <span>{match.distanceKm} km</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      H3: <span className="font-bold text-slate-700">{match.h3Distance} rings</span> • ~{match.estimatedPickupMinutes}m ETA
                                    </div>
                                  </div>

                                  {/* Right: Courier Allocation Card */}
                                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                                    <div className="text-right">
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span className="font-bold text-xs text-slate-900">
                                          {match.riderName}
                                        </span>
                                        <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-200 text-slate-700 rounded uppercase">
                                          {match.vehicleType}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono">
                                        {match.riderPhone || 'No direct phone'} • ⭐ {match.rating || 4.8}
                                      </div>
                                      <div className="text-xs font-mono font-black text-emerald-700 mt-0.5">
                                        ₦{match.payoutNgn.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">(70% Payout)</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* UNASSIGNED VIEW */}
                    {activeTab === 'unassigned' && (
                      <div className="space-y-3">
                        {previewData.unassigned.length === 0 ? (
                          <div className="py-8 text-center text-slate-500 bg-emerald-50 border border-emerald-200 rounded">
                            <span className="material-symbols-outlined text-3xl text-emerald-600 mb-1">
                              check_circle
                            </span>
                            <p className="text-xs font-bold text-emerald-900">All Waybills Successfully Paired!</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              100% of pending cargo has an optimal courier match ready for dispatch.
                            </p>
                          </div>
                        ) : (
                          previewData.unassigned.map((un) => (
                            <div
                              key={un.orderId}
                              className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                    {un.trackingNumber}
                                  </span>
                                  <span className="text-xs text-slate-600 truncate">
                                    {un.pickupAddress}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
                                  <span className="material-symbols-outlined text-sm text-amber-600">
                                    info
                                  </span>
                                  <span className="font-semibold">{un.reason}</span>
                                </div>
                              </div>

                              <div className="text-right font-mono text-xs text-slate-500 shrink-0">
                                Cargo: <span className="font-bold text-slate-800">{un.cargoWeightKg}kg</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {previewData && !executionResult && previewData.matchedCount > 0 && (
              <button
                type="button"
                onClick={handleConfirmBatchDispatch}
                disabled={isExecuting || selectedOrderIds.size === 0}
                className="px-5 py-2.5 text-xs font-mono font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    <span>DISPATCHING ({selectedOrderIds.size})...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>
                      CONFIRM & DISPATCH ({selectedOrderIds.size} WAYBILLS)
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
