'use client';

/**
 * ExpandableCard — Framer Motion Spring Expand/Collapse
 *
 * Accent border, progress gauge, animated expand for route details.
 * Uses Remotion-inspired spring physics for height transition.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/customer/ui/Badge';
import { Button } from '@/components/customer/ui/Button';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';

interface ExpandableCardProps {
  shipment: Shipment;
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

function getAccentColor(status: Shipment['status']) {
  switch (status) {
    case 'PLACED': case 'PAID_UNASSIGNED': return 'bg-accent';
    case 'ASSIGNED': case 'PICKED_UP': return 'bg-primary';
    case 'DELIVERED': return 'bg-success';
    case 'CANCELLED': return 'bg-error';
  }
}

export function ExpandableCard({ shipment }: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-elevated border border-border overflow-hidden group hover:border-primary transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Card Header */}
      <div className="p-4 md:p-5 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center relative">
        {/* Accent Line */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccentColor(shipment.status)}`} />

        <div className="flex items-center gap-4 z-10 pl-3">
          <div className="bg-surface-low p-2 flex items-center justify-center">
            <span className="material-symbols-outlined text-text-muted text-lg" aria-hidden="true">local_shipping</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text font-mono">{shipment.trackingCode}</h3>
            <p className="text-xs text-text-muted">
              {getStatusLabel(shipment.status)} • {shipment.createdAt}
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

        <div className="flex items-center gap-3">
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
                    <span>{shipment.origin}</span>
                    <span className="material-symbols-outlined text-text-dim text-sm" aria-hidden="true">arrow_forward</span>
                    <span>{shipment.destination}</span>
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
                <Button variant="secondary" size="sm" fullWidth icon="description">
                  Waybill
                </Button>
                <Button variant="secondary" size="sm" fullWidth icon="download">
                  Receipt
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}