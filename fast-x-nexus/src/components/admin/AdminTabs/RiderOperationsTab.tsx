'use client';

/**
 * /src/components/admin/AdminTabs/RiderOperationsTab.tsx
 * Fast X Nexus — Enterprise Rider KYC, Fleet Status & Operations
 *
 * Comprehensive fleet roster with KYC verification dossiers,
 * live telemetry indicators, active load metrics, and suspension controls.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateRiderApproval } from '@/app/actions/admin';
import { FeedbackModal, type FeedbackType } from '@/components/ui/FeedbackModal';

export interface RiderAccount {
  id: string;
  role?: string;
  whatsapp_contact?: string | null;
  whatsapp_verified?: boolean;
  active_status?: boolean;
  is_verified?: boolean;
  verification_status?: 'VERIFIED' | 'PENDING';
  vehicle_info?: {
    type?: string;
    plate?: string;
    coverage_zone?: string;
    driver_license_number?: string;
  };
  active_orders_count?: number;
  current_location?: {
    latitude: number;
    longitude: number;
    h3_cell: string;
    updated_at: string;
  } | null;
  metadata?: {
    full_name?: string;
    vehicle_type?: string;
    vehicle_plate?: string;
    driver_license_number?: string;
    coverage_zone?: string;
    rating?: number;
    completed_orders?: number;
    kyc_approved?: boolean;
    onboarded_at?: string;
    approval_notes?: string;
    [key: string]: any;
  };
}

interface RiderOperationsTabProps {
  riders: RiderAccount[];
  onRefresh?: () => void;
}

export function RiderOperationsTab({ riders, onRefresh }: RiderOperationsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_KYC' | 'SUSPENDED'>('ALL');
  const [selectedRiderForDossier, setSelectedRiderForDossier] = useState<RiderAccount | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  const filteredRiders = riders.filter((r) => {
    const fullName = r.metadata?.full_name || '';
    const phone = r.whatsapp_contact || '';
    const plate = r.vehicle_info?.plate || r.metadata?.vehicle_plate || '';
    const zone = r.vehicle_info?.coverage_zone || r.metadata?.coverage_zone || '';

    const matchesSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase()) ||
      plate.toLowerCase().includes(search.toLowerCase()) ||
      zone.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const isApproved =
      r.is_verified ??
      r.metadata?.kyc_approved ??
      (r.active_status && r.whatsapp_verified);
    const isActive = r.active_status !== false;

    if (statusFilter === 'ACTIVE') return isActive && isApproved;
    if (statusFilter === 'PENDING_KYC') return !isApproved;
    if (statusFilter === 'SUSPENDED') return !isActive;
    return true;
  });

  const handleToggleStatus = (rider: RiderAccount, newStatus: boolean) => {
    const riderName = rider.metadata?.full_name || `Rider #${rider.id.slice(0, 8)}`;
    const actionName = newStatus ? 'Approve & Activate' : 'Suspend';

    setFeedbackModal({
      isOpen: true,
      title: `${actionName} Courier`,
      message: newStatus
        ? `Are you sure you want to approve KYC and activate ${riderName}? This courier will immediately start receiving dispatch requests.`
        : `Are you sure you want to suspend ${riderName}? This courier will be removed from dispatch matchmaking.`,
      type: 'confirm',
      confirmLabel: actionName,
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        setIsUpdating(true);
        setActionFeedback(null);
        try {
          const notes = newStatus ? 'Approved by Admin' : 'Suspended by Admin';
          const res = await updateRiderApproval(rider.id, newStatus, notes);
          if (res.success) {
            setActionFeedback(`Updated rider status for ${riderName}`);
            if (selectedRiderForDossier?.id === rider.id) {
              setSelectedRiderForDossier((prev) =>
                prev
                  ? {
                      ...prev,
                      active_status: newStatus,
                      is_verified: newStatus,
                      metadata: { ...prev.metadata, kyc_approved: newStatus },
                    }
                  : null
              );
            }
            if (onRefresh) onRefresh();
          } else {
            setActionFeedback(`Error: ${res.error || 'Failed to update rider'}`);
          }
        } catch (err: any) {
          setActionFeedback(`Error: ${err.message || 'Operation failed'}`);
        } finally {
          setIsUpdating(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-elevated border border-border p-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider name, phone, plate number, or coverage zone..."
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'ACTIVE', 'PENDING_KYC', 'SUSPENDED'] as const).map((filter) => {
              const count =
                filter === 'ALL'
                  ? riders.length
                  : filter === 'ACTIVE'
                  ? riders.filter(
                      (r) =>
                        r.active_status !== false &&
                        (r.is_verified || r.metadata?.kyc_approved || (r.active_status && r.whatsapp_verified))
                    ).length
                  : filter === 'PENDING_KYC'
                  ? riders.filter(
                      (r) =>
                        !(
                          r.is_verified ||
                          r.metadata?.kyc_approved ||
                          (r.active_status && r.whatsapp_verified)
                        )
                    ).length
                  : riders.filter((r) => r.active_status === false).length;

              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-2 text-[10px] font-bold uppercase transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-muted hover:text-text'
                  }`}
                >
                  <span>{filter.replace('_', ' ')}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-sm ${
                      statusFilter === filter
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-dim text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-2 bg-surface border border-border text-xs text-text-muted hover:text-text flex items-center gap-1.5 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Refresh Fleet
          </button>
        )}
      </div>

      {actionFeedback && (
        <div className="p-3 bg-surface border-l-4 border-l-primary border border-border text-xs text-text flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-text-muted hover:text-text text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Riders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRiders.length === 0 ? (
          <div className="col-span-full bg-surface-elevated border border-dashed border-border p-12 text-center text-text-muted space-y-2">
            <span className="material-symbols-outlined text-3xl text-text-dim">two_wheeler</span>
            <p className="text-sm font-bold uppercase">No couriers match filter</p>
            <p className="text-xs">Adjust search query or filter criteria.</p>
          </div>
        ) : (
          filteredRiders.map((rider) => {
            const isApproved =
              rider.is_verified ??
              rider.metadata?.kyc_approved ??
              (rider.active_status && rider.whatsapp_verified);
            const isActive = rider.active_status !== false;
            const vehicleType =
              rider.vehicle_info?.type || rider.metadata?.vehicle_type || 'Motorcycle';
            const vehiclePlate =
              rider.vehicle_info?.plate || rider.metadata?.vehicle_plate || 'Unregistered';
            const coverageZone =
              rider.vehicle_info?.coverage_zone || rider.metadata?.coverage_zone || 'Lagos Central';
            const activeOrders = rider.active_orders_count || 0;

            return (
              <motion.div
                key={rider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-elevated border border-border p-4 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top line: Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-text">
                          {rider.metadata?.full_name || 'Rider Partner'}
                        </span>
                        {isApproved && (
                          <span
                            className="material-symbols-outlined text-xs text-emerald-600"
                            title="KYC Verified"
                          >
                            verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted font-mono">
                        {rider.whatsapp_contact || 'No WhatsApp contact'}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        !isActive
                          ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                          : isApproved
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                      }`}
                    >
                      {!isActive ? 'SUSPENDED' : isApproved ? 'ACTIVE' : 'PENDING KYC'}
                    </span>
                  </div>

                  {/* Vehicle & Zone Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-surface-low border border-border/50 p-2.5">
                    <div>
                      <span className="text-text-dim uppercase block">Vehicle</span>
                      <span className="font-bold text-text uppercase">{vehicleType}</span>
                    </div>
                    <div>
                      <span className="text-text-dim uppercase block">Plate</span>
                      <span className="font-bold text-text uppercase">{vehiclePlate}</span>
                    </div>
                    <div>
                      <span className="text-text-dim uppercase block">Active Loads</span>
                      <span
                        className={`font-bold uppercase ${
                          activeOrders > 0 ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {activeOrders} In-Transit
                      </span>
                    </div>
                    <div>
                      <span className="text-text-dim uppercase block">Coverage Zone</span>
                      <span className="font-bold text-text uppercase truncate block">
                        {coverageZone}
                      </span>
                    </div>
                  </div>

                  {/* Live GPS / Telemetry beacon status if present */}
                  {rider.current_location && (
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 text-[9px] text-text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live GPS Beacon
                      </span>
                      <span>H3: {rider.current_location.h3_cell?.slice(0, 10)}...</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setSelectedRiderForDossier(rider)}
                    className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[10px] uppercase font-bold text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    View Dossier
                  </button>

                  <div className="flex items-center gap-1.5">
                    {rider.whatsapp_contact && (
                      <a
                        href={`https://wa.me/${rider.whatsapp_contact.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                        title="Direct WhatsApp"
                      >
                        <span className="material-symbols-outlined text-[10px]">chat</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleToggleStatus(rider, !isActive)}
                      disabled={isUpdating}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer ${
                        isActive
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                    >
                      {isActive ? 'Suspend' : 'Approve & Activate'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* KYC Verification Dossier Modal */}
      <AnimatePresence>
        {selectedRiderForDossier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-border p-6 max-w-lg w-full shadow-2xl font-mono text-text space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    badge
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Courier Dossier —{' '}
                    {selectedRiderForDossier.metadata?.full_name ||
                      `Rider #${selectedRiderForDossier.id.slice(0, 8)}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRiderForDossier(null)}
                  className="text-text-muted hover:text-text text-sm font-bold min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Dossier Body */}
              <div className="space-y-3 text-xs">
                {/* ID & Status */}
                <div className="p-3 bg-surface-low border border-border space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-dim uppercase text-[10px]">Rider ID:</span>
                    <span className="font-bold">{selectedRiderForDossier.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-dim uppercase text-[10px]">KYC Status:</span>
                    <span
                      className={`font-bold ${
                        selectedRiderForDossier.is_verified ||
                        selectedRiderForDossier.metadata?.kyc_approved
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {selectedRiderForDossier.is_verified ||
                      selectedRiderForDossier.metadata?.kyc_approved
                        ? 'VERIFIED'
                        : 'PENDING AUDIT'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-dim uppercase text-[10px]">WhatsApp Verified:</span>
                    <span className="font-bold">
                      {selectedRiderForDossier.whatsapp_verified ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>

                {/* Identity & Contact */}
                <div className="p-3 bg-surface border border-border space-y-1">
                  <span className="text-[10px] font-black uppercase text-text-dim block mb-1">
                    Contact & Credentials
                  </span>
                  <p>
                    <span className="text-text-dim">Phone / WhatsApp:</span>{' '}
                    <span className="font-bold text-text">
                      {selectedRiderForDossier.whatsapp_contact || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className="text-text-dim">Driver License No:</span>{' '}
                    <span className="font-bold text-text">
                      {selectedRiderForDossier.vehicle_info?.driver_license_number ||
                        selectedRiderForDossier.metadata?.driver_license_number ||
                        'Not Submitted'}
                    </span>
                  </p>
                  <p>
                    <span className="text-text-dim">Coverage Zone:</span>{' '}
                    <span className="font-bold text-text">
                      {selectedRiderForDossier.vehicle_info?.coverage_zone ||
                        selectedRiderForDossier.metadata?.coverage_zone ||
                        'Lagos Metropolitan'}
                    </span>
                  </p>
                </div>

                {/* Vehicle Specs */}
                <div className="p-3 bg-surface border border-border space-y-1">
                  <span className="text-[10px] font-black uppercase text-text-dim block mb-1">
                    Fleet Asset
                  </span>
                  <p>
                    <span className="text-text-dim">Vehicle Type:</span>{' '}
                    <span className="font-bold text-text uppercase">
                      {selectedRiderForDossier.vehicle_info?.type ||
                        selectedRiderForDossier.metadata?.vehicle_type ||
                        'Motorcycle'}
                    </span>
                  </p>
                  <p>
                    <span className="text-text-dim">License Plate:</span>{' '}
                    <span className="font-bold text-text uppercase">
                      {selectedRiderForDossier.vehicle_info?.plate ||
                        selectedRiderForDossier.metadata?.vehicle_plate ||
                        'Unregistered'}
                    </span>
                  </p>
                </div>

                {/* Telemetry info if present */}
                {selectedRiderForDossier.current_location && (
                  <div className="p-3 bg-surface border border-border space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-600 block mb-1 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Telemetry
                    </span>
                    <p className="text-[11px]">
                      Latitude: {selectedRiderForDossier.current_location.latitude.toFixed(6)},
                      Longitude: {selectedRiderForDossier.current_location.longitude.toFixed(6)}
                    </p>
                    <p className="text-[10px] text-text-dim font-mono">
                      H3 Hex Cell: {selectedRiderForDossier.current_location.h3_cell}
                    </p>
                  </div>
                )}
              </div>

              {/* Dossier Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  onClick={() =>
                    handleToggleStatus(
                      selectedRiderForDossier,
                      !Boolean(selectedRiderForDossier.active_status)
                    )
                  }
                  className={`px-4 py-2 text-xs uppercase font-black tracking-wider transition-colors cursor-pointer ${
                    selectedRiderForDossier.active_status !== false
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  {selectedRiderForDossier.active_status !== false
                    ? 'Suspend Courier'
                    : 'Approve & Activate'}
                </button>

                <button
                  onClick={() => setSelectedRiderForDossier(null)}
                  className="px-4 py-2 border border-border text-xs uppercase font-bold text-text-muted hover:text-text cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation & Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
        confirmLabel={feedbackModal.confirmLabel}
        onConfirm={feedbackModal.onConfirm}
        isLoading={isUpdating}
      />
    </div>
  );
}
