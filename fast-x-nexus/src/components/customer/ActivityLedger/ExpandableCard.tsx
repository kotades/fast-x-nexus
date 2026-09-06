'use client';

/**
 * /src/components/customer/ActivityLedger/ExpandableCard.tsx
 * Fast X Nexus — Historical Shipment Card with Delete Option
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/customer/ui/Badge';
import { Button } from '@/components/customer/ui/Button';
import { deleteOrderAction } from '@/app/actions/order';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';
import { BookingDetailsModal } from '@/components/customer/CommandMap/BookingDetailsModal';
import { FeedbackModal, type FeedbackType } from '@/components/ui/FeedbackModal';

interface ExpandableCardProps {
  shipment: Shipment;
  onDeleted?: (id: string) => void;
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
    case 'PAID_UNASSIGNED': return 'Paid — Unassigned';
    case 'ASSIGNED': return 'Assigned';
    case 'PICKED_UP': return 'In Transit';
    case 'IN_TRANSIT': return 'In Transit';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
  }
}

function getAccentColor(status: Shipment['status']) {
  switch (status) {
    case 'PLACED': case 'PAID_UNASSIGNED': return 'bg-accent';
    case 'ASSIGNED': case 'PICKED_UP': case 'IN_TRANSIT': return 'bg-primary';
    case 'DELIVERED': return 'bg-success';
    case 'CANCELLED': return 'bg-error';
  }
}

export function ExpandableCard({ shipment, onDeleted }: ExpandableCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
  const { activeShipment, setActiveShipment, setActiveDeliveriesCount } = useCustomerDashboard();

  const performDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteOrderAction(shipment.id);
      if (res.success) {
        if (activeShipment?.id === shipment.id) {
          setActiveShipment(null);
        }
        setActiveDeliveriesCount((prev) => Math.max(0, prev - 1));
        onDeleted?.(shipment.id);
      } else {
        setFeedbackModal({
          isOpen: true,
          title: 'Deletion Failed',
          message: res.error || 'Failed to delete order.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        title: 'System Error',
        message: err.message || 'Error deleting order.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedbackModal({
      isOpen: true,
      title: 'Delete Order Record',
      message: `Permanently delete order ${shipment.trackingCode}? This cannot be undone.`,
      type: 'confirm',
      confirmLabel: 'Delete Order',
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        await performDelete();
      },
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-elevated border border-border overflow-hidden group hover:border-primary transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Card Header */}
      <div className="p-4 md:p-5 flex flex-wrap md:flex-nowrap justify-between gap-4 items-start md:items-center relative">
        {/* Accent Line */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccentColor(shipment.status)}`} />

        <div className="flex items-center gap-4 z-10 pl-3">
          <div className="bg-surface-low p-2 flex items-center justify-center">
            <span className="material-symbols-outlined text-text-muted text-lg" aria-hidden="true">local_shipping</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text font-mono">{shipment.trackingCode}</h3>
            <p className="text-xs text-text-muted">
              {getStatusLabel(shipment.status)} • {new Date(shipment.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Progress (desktop) */}
        <div className="flex-1 w-full md:w-auto md:max-w-xs mx-4 hidden md:block">
          <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1">
            <span>Origin</span>
            <span>Destination</span>
          </div>
          <div className="h-1.5 bg-surface-dim overflow-hidden">
            <div
              className={`h-full ${getAccentColor(shipment.status)}`}
              style={{ width: `${shipment.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant={getBadgeVariant(shipment.status)} size="sm">
            {getStatusLabel(shipment.status)}
          </Badge>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors"
            aria-hidden="true"
          >
            expand_more
          </motion.span>
        </div>
      </div>

      {/* Expandable Area */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 md:p-5 bg-surface flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted mb-1">
                    Route Details
                  </p>
                  <div className="flex items-center gap-2 text-sm text-text">
                    <span className="truncate">{shipment.origin}</span>
                    <span className="material-symbols-outlined text-text-dim text-sm shrink-0" aria-hidden="true">arrow_forward</span>
                    <span className="truncate">{shipment.destination}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted mb-1">
                    Cargo Spec
                  </p>
                  <p className="text-sm text-text">
                    {shipment.cargoSpec || `${shipment.weight} • Standard package`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:w-48">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon="visibility"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </Button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  Delete Record
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* On-Screen Booking Details Modal */}
      <BookingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        orderId={shipment.id}
      />

      {/* Industrial Deletion Confirmation & Feedback Modal */}
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
    </motion.article>
  );
}