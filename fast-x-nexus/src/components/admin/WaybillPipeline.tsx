'use client';

/**
 * /src/components/admin/WaybillPipeline.tsx
 * Fast X Nexus — Admin Control Tower Waybill Pipeline Board
 *
 * Industrial Monolith tabular and Kanban pipeline for real-time
 * logistics tracking, manual rider assignments, order cancellations,
 * audit trail inspections, and batch auto-dispatch.
 */

import React, { useState, useTransition, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerAutoDispatch, manualAssignRider, reassignOrder } from '@/app/actions/dispatch';
import { cancelOrderAdmin, unassignRiderAdmin } from '@/app/actions/admin';
import { FeedbackModal, type FeedbackType } from '@/components/ui/FeedbackModal';

export interface WaybillOrder {
  id: string;
  customer_id?: string;
  status: string;
  pickup_address?: string;
  dropoff_address?: string;
  pickup_name?: string;
  pickup_phone?: string;
  dropoff_name?: string;
  dropoff_phone?: string;
  pickup_h3_cell?: string;
  dropoff_h3_cell?: string;
  total_amount: number;
  created_at: string;
  rider_id?: string;
  preferred_delivery_time?: string | null;
  metadata?: Record<string, any>;
  parcels?: Array<{
    id: string;
    weight: number | string;
    dimensions?: string;
    description?: string;
  }>;
}

export interface RiderProfile {
  id: string;
  whatsapp_contact?: string;
  whatsapp_verified?: boolean;
  active_status?: boolean;
  metadata?: {
    full_name?: string;
    vehicle_type?: string;
    vehicle_plate?: string;
    driver_license_number?: string;
    coverage_zone?: string;
    rating?: number;
    kyc_approved?: boolean;
  };
}

interface WaybillPipelineProps {
  initialOrders: WaybillOrder[];
  riders: RiderProfile[];
  onRefresh?: () => void;
}

export function WaybillPipeline({ initialOrders, riders, onRefresh }: WaybillPipelineProps) {
  const [orders, setOrders] = useState<WaybillOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Modals state
  const [inspectedOrder, setInspectedOrder] = useState<WaybillOrder | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetOrderForAssign, setTargetOrderForAssign] = useState<WaybillOrder | null>(null);
  const [targetRiderId, setTargetRiderId] = useState<string>('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetOrderForCancel, setTargetOrderForCancel] = useState<WaybillOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [dispatchStats, setDispatchStats] = useState<string | null>(null);

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

  // Sync state if props change
  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Search & Filter
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (activeFilter === 'UNASSIGNED' && o.status !== 'PAID_UNASSIGNED') return false;
      if (
        activeFilter === 'IN_TRANSIT' &&
        !['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
      )
        return false;
      if (activeFilter === 'DELIVERED' && o.status !== 'DELIVERED') return false;
      if (activeFilter === 'PLACED' && o.status !== 'PLACED') return false;
      if (activeFilter === 'CANCELLED' && o.status !== 'CANCELLED') return false;
      if (activeFilter !== 'ALL' && !['UNASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'PLACED', 'CANCELLED'].includes(activeFilter) && o.status !== activeFilter) {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const waybillCode = `fx-${o.id.slice(0, 8)}`.toLowerCase();
        const idMatch = o.id.toLowerCase().includes(query) || waybillCode.includes(query);
        const pickupNameMatch = (o.pickup_name || '').toLowerCase().includes(query);
        const dropoffNameMatch = (o.dropoff_name || '').toLowerCase().includes(query);
        const pickupAddrMatch = (o.pickup_address || '').toLowerCase().includes(query);
        const dropoffAddrMatch = (o.dropoff_address || '').toLowerCase().includes(query);
        const pickupPhoneMatch = (o.pickup_phone || '').toLowerCase().includes(query);
        const dropoffPhoneMatch = (o.dropoff_phone || '').toLowerCase().includes(query);

        return (
          idMatch ||
          pickupNameMatch ||
          dropoffNameMatch ||
          pickupAddrMatch ||
          dropoffAddrMatch ||
          pickupPhoneMatch ||
          dropoffPhoneMatch
        );
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  const handleRunAutoDispatch = () => {
    startTransition(async () => {
      setDispatchStats('Running H3 Greedy Dispatch Engine...');
      const res = await triggerAutoDispatch();
      if (res.success) {
        setDispatchStats(
          `Auto-dispatch complete: ${res.allocatedCount} orders allocated, ${res.unassignedCount} remaining unassigned.`
        );
        if (onRefresh) {
          onRefresh();
        } else {
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        setDispatchStats(`Dispatch error: ${res.error}`);
      }
    });
  };

  const handleOpenAssignModal = (order: WaybillOrder) => {
    setTargetOrderForAssign(order);
    setTargetRiderId(order.rider_id || '');
    setAssignModalOpen(true);
  };

  const handleAssignRiderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderForAssign || !targetRiderId) return;

    startTransition(async () => {
      const res = await manualAssignRider(targetOrderForAssign.id, targetRiderId);
      if (res.success) {
        setAssignModalOpen(false);
        setTargetOrderForAssign(null);
        if (inspectedOrder?.id === targetOrderForAssign.id) {
          setInspectedOrder((prev) =>
            prev ? { ...prev, rider_id: targetRiderId, status: 'ASSIGNED' } : null
          );
        }
        setFeedbackModal({
          isOpen: true,
          title: 'Rider Assigned',
          message: `Rider successfully assigned to Waybill FX-${targetOrderForAssign.id.slice(0, 8).toUpperCase()}.`,
          type: 'success',
        });
        if (onRefresh) onRefresh();
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Assignment Failed',
          message: res.error || 'Failed to assign rider to this waybill.',
          type: 'error',
        });
      }
    });
  };

  const handleUnassignRider = (order: WaybillOrder) => {
    setFeedbackModal({
      isOpen: true,
      title: 'Unassign Courier',
      message: `Unassign courier from waybill FX-${order.id.slice(0, 8).toUpperCase()}? This order will return to the unassigned job pool.`,
      type: 'confirm',
      confirmLabel: 'Unassign Courier',
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        startTransition(async () => {
          const res = await unassignRiderAdmin(order.id, 'Manual admin unassignment from Waybill Board');
          if (res.success) {
            if (inspectedOrder?.id === order.id) {
              setInspectedOrder((prev) =>
                prev ? { ...prev, rider_id: undefined, status: 'PAID_UNASSIGNED' } : null
              );
            }
            if (onRefresh) onRefresh();
          } else {
            setFeedbackModal({
              isOpen: true,
              title: 'Unassign Failed',
              message: res.error || 'Failed to unassign courier',
              type: 'error',
            });
          }
        });
      },
    });
  };

  const handleOpenCancelModal = (order: WaybillOrder) => {
    setTargetOrderForCancel(order);
    setCancelReason('Customer requested cancellation');
    setCancelModalOpen(true);
  };

  const handleCancelOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrderForCancel || !cancelReason.trim()) return;

    startTransition(async () => {
      const res = await cancelOrderAdmin(targetOrderForCancel.id, cancelReason.trim());
      if (res.success) {
        setCancelModalOpen(false);
        if (inspectedOrder?.id === targetOrderForCancel.id) {
          setInspectedOrder((prev) =>
            prev ? { ...prev, status: 'CANCELLED' } : null
          );
        }
        setFeedbackModal({
          isOpen: true,
          title: 'Waybill Cancelled',
          message: `Waybill FX-${targetOrderForCancel.id.slice(0, 8).toUpperCase()} was successfully cancelled.`,
          type: 'success',
        });
        setTargetOrderForCancel(null);
        if (onRefresh) onRefresh();
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Cancellation Failed',
          message: res.error || 'Failed to cancel order',
          type: 'error',
        });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'ASSIGNED':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'PAID_UNASSIGNED':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30 animate-pulse';
      case 'PLACED':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Search / Filters */}
      <div className="bg-surface-elevated border border-border p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by FX waybill code, name, phone, or address..."
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAutoDispatch}
              disabled={isPending}
              className="min-h-[38px] bg-primary hover:bg-primary/90 text-white font-mono font-black text-xs uppercase tracking-widest px-4 py-2 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                bolt
              </span>
              <span>{isPending ? 'ORCHESTRATING...' : 'AUTO-DISPATCH POOL'}</span>
            </button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'UNASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'PLACED', 'CANCELLED'].map((filter) => {
            const count =
              filter === 'ALL'
                ? orders.length
                : filter === 'UNASSIGNED'
                ? orders.filter((o) => o.status === 'PAID_UNASSIGNED').length
                : filter === 'IN_TRANSIT'
                ? orders.filter((o) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)).length
                : filter === 'DELIVERED'
                ? orders.filter((o) => o.status === 'DELIVERED').length
                : filter === 'PLACED'
                ? orders.filter((o) => o.status === 'PLACED').length
                : orders.filter((o) => o.status === 'CANCELLED').length;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-muted hover:text-text'
                }`}
              >
                <span>{filter.replace('_', ' ')}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-sm ${
                    activeFilter === filter ? 'bg-white/20 text-white' : 'bg-surface-dim text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {dispatchStats && (
        <div className="p-3 bg-surface-elevated border-l-4 border-l-primary border border-border text-xs font-mono text-text flex items-center justify-between">
          <span>{dispatchStats}</span>
          <button
            onClick={() => setDispatchStats(null)}
            className="text-text-muted hover:text-text text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-surface-elevated border border-border overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-surface-low border-b border-border text-[10px] text-text-dim uppercase tracking-wider">
              <th className="p-3">Waybill / ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Dropoff</th>
              <th className="p-3">Rider</th>
              <th className="p-3">Amount</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-muted">
                  No shipments found matching &quot;{activeFilter}&quot;
                  {searchQuery ? ` and search &quot;${searchQuery}&quot;` : ''}.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const assignedRider = riders.find((r) => r.id === order.rider_id);
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-surface-dim transition-colors group cursor-pointer"
                    onClick={() => setInspectedOrder(order)}
                  >
                    <td className="p-3 font-bold text-text">
                      <div className="flex items-center gap-1.5">
                        <span>FX-{order.id.substring(0, 8).toUpperCase()}</span>
                        <span className="material-symbols-outlined text-xs text-text-dim opacity-0 group-hover:opacity-100 transition-opacity">
                          open_in_new
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted font-normal">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase tracking-wider ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 max-w-[180px] truncate" title={order.pickup_address}>
                      <span className="text-text font-medium">{order.pickup_name || 'Sender'}</span>
                      <div className="text-[10px] text-text-muted truncate">
                        {order.pickup_address || 'Lagos Hub'}
                      </div>
                    </td>
                    <td className="p-3 max-w-[180px] truncate" title={order.dropoff_address}>
                      <span className="text-text font-medium">{order.dropoff_name || 'Recipient'}</span>
                      <div className="text-[10px] text-text-muted truncate">
                        {order.dropoff_address || 'Dropoff Hub'}
                      </div>
                    </td>
                    <td className="p-3">
                      {assignedRider ? (
                        <div className="flex items-center gap-1.5 text-text font-bold">
                          <span className="material-symbols-outlined text-primary text-xs">
                            two_wheeler
                          </span>
                          <span className="truncate max-w-[140px]">
                            {assignedRider.metadata?.full_name ||
                              assignedRider.whatsapp_contact ||
                              'Assigned'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-black text-text">
                      ₦{Number(order.total_amount || 0).toLocaleString('en-NG')}
                    </td>
                    <td
                      className="p-3 text-right"
                      onClick={(e) => e.stopPropagation()} // Prevent opening details modal on action click
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Button */}
                        <button
                          onClick={() => setInspectedOrder(order)}
                          className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[10px] uppercase font-bold text-text-muted hover:text-text transition-colors cursor-pointer"
                          title="Inspect Details"
                        >
                          Inspect
                        </button>

                        {/* Assign / Reassign Button */}
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleOpenAssignModal(order)}
                            className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[10px] uppercase font-bold text-text-muted hover:text-text transition-colors cursor-pointer"
                          >
                            {order.rider_id ? 'Reassign' : 'Assign'}
                          </button>
                        )}

                        {/* Unassign Quick Button */}
                        {order.rider_id &&
                          order.status !== 'DELIVERED' &&
                          order.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleUnassignRider(order)}
                              className="px-2 py-1 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-[10px] font-bold uppercase cursor-pointer"
                              title="Unassign Courier"
                            >
                              ✕
                            </button>
                          )}

                        {/* Cancel Order Button */}
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleOpenCancelModal(order)}
                            className="px-2 py-1 text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-[10px] font-bold uppercase cursor-pointer"
                            title="Cancel Waybill"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Comprehensive Waybill Inspection Modal */}
      <AnimatePresence>
        {inspectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-border p-6 max-w-2xl w-full shadow-2xl font-mono text-text space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">
                      inventory_2
                    </span>
                    <h3 className="text-base font-black uppercase tracking-wider">
                      Waybill FX-{inspectedOrder.id.substring(0, 8).toUpperCase()}
                    </h3>
                    <span
                      className={`px-2 py-0.5 border text-[10px] font-black uppercase tracking-wider ${getStatusBadge(
                        inspectedOrder.status
                      )}`}
                    >
                      {inspectedOrder.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    UUID: {inspectedOrder.id} • Booked on{' '}
                    {new Date(inspectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setInspectedOrder(null)}
                  className="text-text-muted hover:text-text text-base font-bold min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Financial Split Breakdown */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-surface-low border border-border text-xs">
                <div>
                  <span className="text-[10px] text-text-dim uppercase block">Gross Billed</span>
                  <span className="text-base font-black text-text">
                    ₦{Number(inspectedOrder.total_amount).toLocaleString('en-NG')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-dim uppercase block">
                    Courier Escrow (70%)
                  </span>
                  <span className="text-base font-black text-blue-600">
                    ₦{Math.round(Number(inspectedOrder.total_amount) * 0.7).toLocaleString('en-NG')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-dim uppercase block">
                    Fast X Take-rate (30%)
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    ₦{Math.round(Number(inspectedOrder.total_amount) * 0.3).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>

              {/* Route & Security Verification Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup Hub */}
                <div className="p-3.5 bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">trip_origin</span>
                      Origin (Pickup)
                    </span>
                    {inspectedOrder.metadata?.pickup_pin && (
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-black tracking-widest">
                        PIN: {inspectedOrder.metadata.pickup_pin}
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-text">{inspectedOrder.pickup_name || 'Sender'}</p>
                    <p className="text-text-muted">{inspectedOrder.pickup_phone || 'No phone'}</p>
                    <p className="text-text-dim text-[11px]">{inspectedOrder.pickup_address}</p>
                    {inspectedOrder.pickup_h3_cell && (
                      <p className="text-[9px] text-text-dim font-mono">
                        H3: {inspectedOrder.pickup_h3_cell}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dropoff Hub */}
                <div className="p-3.5 bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      Destination (Dropoff)
                    </span>
                    {inspectedOrder.metadata?.delivery_pin && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[10px] font-black tracking-widest">
                        PIN: {inspectedOrder.metadata.delivery_pin}
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-text">
                      {inspectedOrder.dropoff_name || 'Recipient'}
                    </p>
                    <p className="text-text-muted">{inspectedOrder.dropoff_phone || 'No phone'}</p>
                    <p className="text-text-dim text-[11px]">{inspectedOrder.dropoff_address}</p>
                    {inspectedOrder.dropoff_h3_cell && (
                      <p className="text-[9px] text-text-dim font-mono">
                        H3: {inspectedOrder.dropoff_h3_cell}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parcel & Cargo Information */}
              <div className="p-3.5 bg-surface border border-border space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-dim block">
                  Cargo Specifications
                </span>
                {inspectedOrder.parcels && inspectedOrder.parcels.length > 0 ? (
                  inspectedOrder.parcels.map((parcel, idx) => (
                    <div key={parcel.id || idx} className="text-xs text-text space-y-1">
                      <p className="font-bold">{parcel.description || 'Standard Cargo'}</p>
                      <p className="text-[11px] text-text-muted">
                        Weight: {parcel.weight} kg • Dimensions: {parcel.dimensions || 'Standard'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted">Standard Express Parcel (5 kg)</p>
                )}
              </div>

              {/* Assigned Courier Profile */}
              <div className="p-3.5 bg-surface border border-border space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-dim block">
                  Assigned Courier
                </span>
                {(() => {
                  const rider = riders.find((r) => r.id === inspectedOrder.rider_id);
                  if (rider) {
                    return (
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-text flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary text-sm">
                              two_wheeler
                            </span>
                            {rider.metadata?.full_name || 'Rider Partner'}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            Phone: {rider.whatsapp_contact || 'N/A'} • Vehicle:{' '}
                            {rider.metadata?.vehicle_type || 'Motorcycle'} (
                            {rider.metadata?.vehicle_plate || 'No plate'})
                          </p>
                        </div>
                        {rider.whatsapp_contact && (
                          <a
                            href={`https://wa.me/${rider.whatsapp_contact.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold uppercase"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    );
                  }
                  return (
                    <p className="text-xs text-amber-500 font-bold uppercase">
                      No courier assigned yet (Waiting in job pool)
                    </p>
                  );
                })()}
              </div>

              {/* Audit Trail Timeline */}
              <div className="p-3.5 bg-surface border border-border space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-dim block">
                  Waybill Audit Trail
                </span>
                {Array.isArray(inspectedOrder.metadata?.audit_trail) &&
                inspectedOrder.metadata.audit_trail.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {inspectedOrder.metadata.audit_trail.map((evt: any, i: number) => (
                      <div
                        key={i}
                        className="text-[10px] p-2 bg-surface-low border border-border/60 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-text uppercase mr-2">{evt.event}</span>
                          <span className="text-text-muted">{evt.reason || evt.previous_status || ''}</span>
                        </div>
                        <span className="text-text-dim">
                          {evt.assigned_at || evt.cancelled_at || evt.unassigned_at
                            ? new Date(
                                evt.assigned_at || evt.cancelled_at || evt.unassigned_at
                              ).toLocaleTimeString()
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted">
                    Order created at {new Date(inspectedOrder.created_at).toLocaleTimeString()}.
                  </p>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  {inspectedOrder.status !== 'DELIVERED' && inspectedOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleOpenCancelModal(inspectedOrder)}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-500/10 border border-red-500/30 uppercase font-bold cursor-pointer"
                    >
                      Cancel Waybill
                    </button>
                  )}
                  {inspectedOrder.rider_id &&
                    inspectedOrder.status !== 'DELIVERED' &&
                    inspectedOrder.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUnassignRider(inspectedOrder)}
                        className="px-3 py-1.5 text-xs text-text-muted hover:text-text border border-border uppercase font-bold cursor-pointer"
                      >
                        Unassign Courier
                      </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                  {inspectedOrder.status !== 'DELIVERED' && inspectedOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleOpenAssignModal(inspectedOrder)}
                      className="px-4 py-2 bg-primary text-white text-xs uppercase font-black tracking-wider hover:bg-primary/90 cursor-pointer shadow-sm"
                    >
                      {inspectedOrder.rider_id ? 'Reassign Courier' : 'Assign Courier'}
                    </button>
                  )}
                  <button
                    onClick={() => setInspectedOrder(null)}
                    className="px-4 py-2 border border-border text-xs uppercase font-bold text-text-muted hover:text-text cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rider Assignment Modal */}
      <AnimatePresence>
        {assignModalOpen && targetOrderForAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-border p-6 max-w-md w-full shadow-2xl font-mono text-text space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Assign Rider — FX-{targetOrderForAssign.id.substring(0, 8).toUpperCase()}
                </h3>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="text-text-muted hover:text-text text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-1 text-text-muted bg-surface-low p-3 border border-border">
                <p>
                  <span className="text-text font-bold">Pickup:</span>{' '}
                  {targetOrderForAssign.pickup_address}
                </p>
                <p>
                  <span className="text-text font-bold">Dropoff:</span>{' '}
                  {targetOrderForAssign.dropoff_address}
                </p>
                <p>
                  <span className="text-text font-bold">Amount:</span> ₦
                  {Number(targetOrderForAssign.total_amount).toLocaleString('en-NG')}
                </p>
              </div>

              <form onSubmit={handleAssignRiderSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-text-dim mb-1">
                    Select Driver / Rider
                  </label>
                  <select
                    value={targetRiderId}
                    onChange={(e) => setTargetRiderId(e.target.value)}
                    required
                    className="w-full bg-surface border border-border text-text px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Rider --</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.metadata?.full_name || 'Rider'} (
                        {r.whatsapp_contact || r.id.substring(0, 6)}) —{' '}
                        {r.metadata?.vehicle_type || 'Motorcycle'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 border border-border text-xs uppercase font-bold text-text-muted hover:text-text cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !targetRiderId}
                    className="px-4 py-2 bg-primary text-white text-xs uppercase font-black tracking-wider hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? 'ASSIGNING...' : 'CONFIRM ASSIGNMENT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModalOpen && targetOrderForCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-border p-6 max-w-md w-full shadow-2xl font-mono text-text space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-red-600">
                  Cancel Waybill FX-{targetOrderForCancel.id.substring(0, 8).toUpperCase()}
                </h3>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="text-text-muted hover:text-text text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-text-muted">
                Cancelling this order will evict it from courier dispatch, log an audit event, and mark
                the shipment as CANCELLED.
              </p>

              <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-text-dim mb-1">
                    Cancellation Reason
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-surface border border-border text-text px-3 py-2 text-xs focus:outline-none focus:border-primary mb-2"
                  >
                    <option value="Customer requested cancellation">Customer requested cancellation</option>
                    <option value="Address unreachable or incorrect">Address unreachable or incorrect</option>
                    <option value="Cargo policy violation">Cargo policy violation</option>
                    <option value="Duplicate booking order">Duplicate booking order</option>
                    <option value="Custom">Custom Reason...</option>
                  </select>

                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason..."
                    required
                    className="w-full bg-surface border border-border text-text px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(false)}
                    className="px-4 py-2 border border-border text-xs uppercase font-bold text-text-muted hover:text-text cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !cancelReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white text-xs uppercase font-black tracking-wider hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isPending ? 'CANCELLING...' : 'CONFIRM CANCELLATION'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
        isLoading={isPending}
      />
    </div>
  );
}
