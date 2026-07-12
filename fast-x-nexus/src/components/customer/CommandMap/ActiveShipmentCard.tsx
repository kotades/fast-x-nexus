'use client';

/**
 * ActiveShipmentCard — Pinned Bottom-Left Shipment Tracker
 *
 * Glass panel card showing active routing details with animated progress.
 * Framer Motion spring slide-up entrance.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/customer/ui/Badge';
import { Button } from '@/components/customer/ui/Button';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';

interface ActiveShipmentCardProps {
  shipment: Shipment;
  onDetails?: () => void;
  onIntercept?: () => void;
}

function getBadgeVariant(status: Shipment['status']) {
  switch (status) {
    case 'PLACED': return 'warning' as const;
    case 'PAID_UNASSIGNED': return 'warning' as const;
    case 'ASSIGNED': return 'primary' as const;
    case 'PICKED_UP': return 'primary' as const;
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
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
  }
}

export function ActiveShipmentCard({ shipment, onDetails, onIntercept }: ActiveShipmentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 200,
        mass: 1,
        delay: 0.3,
      }}
      className="absolute bottom-6 left-6 z-20 w-80 glass-panel border-l-4 border-l-primary p-5 shadow-lg"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted mb-1">
            Active Routing
          </p>
          <h2 className="text-xl font-black text-text tracking-tight font-mono">
            {shipment.trackingCode}
          </h2>
        </div>
        <Badge variant={getBadgeVariant(shipment.status)} size="sm" dot pulse={shipment.status === 'PICKED_UP'}>
          {getStatusLabel(shipment.status)}
        </Badge>
      </div>

      {/* Route Timeline */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-text-dim text-lg" aria-hidden="true">my_location</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">{shipment.origin}</p>
            <p className="text-xs text-text-muted">Departed</p>
          </div>
        </div>
        <div className="ml-[13px] border-l-2 border-border h-5" />
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">location_on</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-text">{shipment.destination}</p>
            {shipment.eta && (
              <p className="text-xs text-primary font-semibold">ETA {shipment.eta}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span className="font-mono">Progress</span>
          <span className="font-mono font-bold">{shipment.progress}%</span>
        </div>
        <div className="w-full h-2 bg-surface-dim overflow-hidden" style={{ borderRadius: '0' }}>
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${shipment.progress}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" fullWidth onClick={onDetails}>
          Details
        </Button>
        <Button variant="primary" size="sm" fullWidth onClick={onIntercept}>
          Intercept
        </Button>
      </div>
    </motion.div>
  );
}