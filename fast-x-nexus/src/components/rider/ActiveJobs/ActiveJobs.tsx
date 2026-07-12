'use client';

/**
 * ActiveJobs — Waybill Console for Active Deliveries
 *
 * Displays the current delivery with progress tracking, pickup/dropoff details.
 * Built from Stitch design: Active_waybill.html
 */

import React from 'react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/customer/shared/EmptyState';

// Mock active job for development
const activeJob = {
  id: 'NX-7892',
  pickup: '42 Awolowo Road, Ikoyi, Lagos',
  dropoff: '15 Ajose Adeogun, Victoria Island, Lagos',
  customerName: 'Mr. Adewale',
  customerPhone: '+234 802 345 6789',
  status: 'picked_up' as const,
  progress: 60,
  eta: '15 mins',
  earnings: 2500,
};

const progressMap: Record<string, number> = {
  accepted: 20,
  picked_up: 60,
  delivered: 100,
};

const statusLabels: Record<string, string> = {
  accepted: 'Heading to pickup',
  picked_up: 'En route to dropoff',
  delivered: 'Delivered',
};

export function ActiveJobs() {
  if (!activeJob) {
    return <EmptyState icon="local_shipping" title="No Active Jobs" description="Accept a job from the pool to get started." />;
  }

  const progress = progressMap[activeJob.status] || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-text">Active Delivery</h1>
          <p className="text-xs font-mono text-text-muted mt-1">Waybill #{activeJob.id}</p>
        </div>
        <span className="px-3 py-1 bg-primary/10 border-2 border-primary text-primary text-xs font-bold uppercase tracking-wider">
          {statusLabels[activeJob.status]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-2 border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Progress</span>
          <span className="text-xs font-mono font-bold text-primary">{activeJob.eta} remaining</span>
        </div>
        <div className="w-full h-3 bg-surface-dim border border-border">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 1 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-text-muted">Accepted</span>
          <span className="text-[10px] font-mono text-text-muted">Picked Up</span>
          <span className="text-[10px] font-mono text-text-muted">Delivered</span>
        </div>
      </div>

      {/* Route Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-xs font-bold uppercase tracking-wider text-text">Pickup</span>
          </div>
          <p className="text-sm font-medium">{activeJob.pickup}</p>
          <p className="text-xs text-text-muted font-mono mt-1">{activeJob.customerName}</p>
        </div>
        <div className="bg-white border-2 border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 bg-secondary rounded-full" />
            <span className="text-xs font-bold uppercase tracking-wider text-text">Dropoff</span>
          </div>
          <p className="text-sm font-medium">{activeJob.dropoff}</p>
        </div>
      </div>

      {/* Contact & Action */}
      <div className="bg-white border-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Customer Contact</p>
            <p className="text-sm font-medium">{activeJob.customerName}</p>
            <p className="text-xs font-mono text-text-muted">{activeJob.customerPhone}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border-2 border-border text-xs font-bold uppercase tracking-wider hover:bg-surface-dim transition-colors">
              <span className="material-symbols-outlined text-[16px]">call</span>
            </button>
            <button className="px-4 py-2 border-2 border-border text-xs font-bold uppercase tracking-wider hover:bg-surface-dim transition-colors">
              <span className="material-symbols-outlined text-[16px]">chat</span>
            </button>
            <button className="px-4 py-2 bg-primary text-primary-text text-xs font-bold uppercase tracking-wider border-2 border-border hover:bg-primary/90 transition-colors">
              Mark Delivered
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}