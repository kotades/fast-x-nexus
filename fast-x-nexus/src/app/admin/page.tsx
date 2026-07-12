'use client';

import React from 'react';
import { AdminDashboardLayout } from '@/components/layouts/AdminDashboardLayout';

export default function AdminPage() {
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-text-dim mb-2">
            Operations / Monitor
          </p>
          <h1 className="text-2xl font-black text-text tracking-tight uppercase">Admin Control Tower</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time monitoring of all logistics pipelines and system-wide ledgers.
          </p>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Shipments', value: '0', change: '+0% this hour' },
            { label: 'Unassigned Pool', value: '0', change: 'No pending orders' },
            { label: 'Online Riders', value: '0', change: '0 active telemetry' },
            { label: 'System Revenue', value: '₦0.00', change: 'Escrow balanced' },
          ].map((metric) => (
            <div key={metric.label} className="bg-surface-elevated border border-border border-l-[3px] border-l-primary p-5">
              <p className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-2">{metric.label}</p>
              <h2 className="text-3xl font-black font-mono text-text">{metric.value}</h2>
              <p className="text-xs text-text-muted mt-1">{metric.change}</p>
            </div>
          ))}
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-elevated border border-border p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-text font-mono mb-4">Waybill Pipeline</h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-border bg-surface-low text-text-muted text-xs uppercase tracking-widest font-mono">
              Pipeline Empty
            </div>
          </div>
          <div className="bg-surface-elevated border border-border p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-text font-mono mb-4">Rider Telemetry Map</h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-border bg-surface-low text-text-muted text-xs uppercase tracking-widest font-mono">
              No active telemetry
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
