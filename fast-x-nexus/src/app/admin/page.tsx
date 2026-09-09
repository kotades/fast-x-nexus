'use client';

/**
 * /src/app/admin/page.tsx
 * Fast X Nexus — Enterprise Admin Control Tower Suite
 *
 * Modular 6-Tab Operations Control Center:
 * 1. Live Spatial Radar & Auto-Dispatch
 * 2. Waybill Pipeline & Manual Assignment Board
 * 3. Rider Fleet Operations & KYC Approvals
 * 4. Financial Ledger & 70/30 Escrow Pool
 * 5. System Telemetry & Spatial Health Monitor
 * 6. Omnichannel Comms & Dispatch Radio
 */

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDashboardLayout } from '@/components/layouts/AdminDashboardLayout';
import { WaybillPipeline } from '@/components/admin/WaybillPipeline';
import { FleetRadarMap } from '@/components/admin/FleetRadarMap';
import { RiderOperationsTab } from '@/components/admin/AdminTabs/RiderOperationsTab';
import { FinancialLedgerTab } from '@/components/admin/AdminTabs/FinancialLedgerTab';
import { SystemHealthTab } from '@/components/admin/AdminTabs/SystemHealthTab';
import { AdminChatInboxTab } from '@/components/admin/AdminTabs/AdminChatInboxTab';
import { getWaybillPipeline } from '@/app/actions/dispatch';
import { getAllRidersAdmin } from '@/app/actions/admin';

type AdminTab = 'radar' | 'waybills' | 'riders' | 'ledger' | 'telemetry' | 'chat';

const TAB_CONFIG: Record<AdminTab, { subtitle: string; title: string; description: string }> = {
  radar: {
    subtitle: 'OPERATIONS / SPATIAL RADAR',
    title: 'Live Spatial Radar',
    description: 'Real-time courier telemetry, speed beacons, and H3 coverage zones across Lagos.',
  },
  waybills: {
    subtitle: 'OPERATIONS / WAYBILL BOARD',
    title: 'Waybill Pipeline & Dispatch Board',
    description: 'Live order lifecycle management, manual courier assignment, and dispatch queue.',
  },
  riders: {
    subtitle: 'OPERATIONS / RIDER FLEET OPS',
    title: 'Courier Fleet Operations',
    description: 'Rider verification, KYC approval, active roster, and live transit performance.',
  },
  ledger: {
    subtitle: 'FINANCE / ESCROW & LEDGER',
    title: 'Escrow & Financial Ledger',
    description: 'System GMV, 70/30 escrow balances, rider payout processing, and margin audits.',
  },
  telemetry: {
    subtitle: 'INFRASTRUCTURE / SYSTEM HEALTH',
    title: 'System Telemetry & Health',
    description: 'Database latency, H3 spatial cluster status, and API health monitoring.',
  },
  chat: {
    subtitle: 'COMMUNICATIONS / DISPATCH RADIO',
    title: 'Omnichannel Operations Comms',
    description: 'Real-time dispatch radio, courier messaging, and customer assistance channels.',
  },
};

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabQuery = (searchParams.get('tab') as AdminTab) || 'radar';
  const [activeTab, setActiveTab] = useState<AdminTab>(tabQuery);

  const [pipelineData, setPipelineData] = useState<{
    orders: any[];
    riders: any[];
  }>({ orders: [], riders: [] });
  const [loading, setLoading] = useState(true);

  // Synchronize tab if query param changes
  useEffect(() => {
    if (tabQuery && ['radar', 'waybills', 'riders', 'ledger', 'telemetry', 'chat'].includes(tabQuery)) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  // Listen to browser Back / Forward history popstate
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab') as AdminTab;
        if (t && ['radar', 'waybills', 'riders', 'ledger', 'telemetry', 'chat'].includes(t)) {
          setActiveTab(t);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Listen to custom event dispatched by Sidebar
  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.tab && ['radar', 'waybills', 'riders', 'ledger', 'telemetry', 'chat'].includes(custom.detail.tab)) {
        setActiveTab(custom.detail.tab as AdminTab);
      }
    };
    window.addEventListener('fastx:admin:set_tab', handleSetTab);
    return () => {
      window.removeEventListener('fastx:admin:set_tab', handleSetTab);
    };
  }, []);

  const changeTab = (tab: AdminTab) => {
    setActiveTab(tab);
    window.history.pushState(null, '', `/admin?tab=${tab}`);
    window.dispatchEvent(new CustomEvent('fastx:admin:set_tab', { detail: { tab } }));
  };

  const fetchPipeline = useCallback(async () => {
    try {
      const [pipelineRes, ridersRes] = await Promise.all([
        getWaybillPipeline(),
        getAllRidersAdmin(),
      ]);

      const orders = pipelineRes.success ? pipelineRes.orders : [];
      let riders = pipelineRes.success ? pipelineRes.riders : [];

      // Enrich riders with detailed KYC, active order counts, and locations if available
      if (ridersRes.success && ridersRes.riders) {
        riders = ridersRes.riders;
      }

      setPipelineData({ orders, riders });
    } catch (err) {
      console.warn('[AdminPage] Error fetching pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    // Auto-refresh every 12 seconds in the background
    const interval = setInterval(fetchPipeline, 12000);
    return () => clearInterval(interval);
  }, [fetchPipeline]);

  const totalOrders = pipelineData.orders.length;
  const unassignedOrders = pipelineData.orders.filter(
    (o) => o.status === 'PAID_UNASSIGNED' || o.status === 'PLACED'
  ).length;
  const inTransitOrders = pipelineData.orders.filter(
    (o) => o.status === 'ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'IN_TRANSIT'
  ).length;
  const totalRevenue = pipelineData.orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // Dispatch active count badges to Sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fastx:admin:update_counts', {
          detail: {
            waybills: unassignedOrders,
            riders: pipelineData.riders.length,
          },
        })
      );
    }
  }, [unassignedOrders, pipelineData.riders.length]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 pb-16 font-sans">
      {/* Header Title with Dynamic Active Section Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {TAB_CONFIG[activeTab]?.subtitle || 'OPERATIONS / CONTROL TOWER'}
          </p>
          <h1 className="text-2xl font-black text-text tracking-tight uppercase">
            {TAB_CONFIG[activeTab]?.title || 'Admin Control Tower'}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {TAB_CONFIG[activeTab]?.description || 'Live telemetry radar, multi-waypoint dispatch orchestration, and escrow ledger.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchPipeline();
            }}
            className="px-3.5 py-2 bg-surface border border-border text-xs font-bold text-text-muted hover:text-text uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Refresh Live Data
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Pipeline',
            value: inTransitOrders.toString(),
            change: `${totalOrders} total shipments tracked`,
            icon: 'local_shipping',
            color: 'border-l-blue-500',
          },
          {
            label: 'Unassigned Pool',
            value: unassignedOrders.toString(),
            change: unassignedOrders > 0 ? 'Requires auto-dispatch' : 'Pool cleared',
            icon: 'pending_actions',
            color: 'border-l-amber-500',
          },
          {
            label: 'Online Fleet',
            value: pipelineData.riders.length.toString(),
            change: `${pipelineData.riders.length} couriers registered`,
            icon: 'two_wheeler',
            color: 'border-l-primary',
          },
          {
            label: 'System GMV / Escrow',
            value: `₦${totalRevenue.toLocaleString('en-NG')}`,
            change: 'Escrow balanced (70/30 split)',
            icon: 'account_balance_wallet',
            color: 'border-l-emerald-500',
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className={`bg-surface-elevated border border-border border-l-[3px] ${metric.color} p-4 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-dim">
                {metric.label}
              </p>
              <span className="material-symbols-outlined text-sm text-text-muted">
                {metric.icon}
              </span>
            </div>
            <h2 className="text-2xl font-black text-text">{metric.value}</h2>
            <p className="text-[10px] text-text-muted mt-1">{metric.change}</p>
          </div>
        ))}
      </div>

      {/* Tab Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'radar' && (
          <motion.div
            key="radar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 1. Full-Span Live Spatial Operations Console */}
            <div className="w-full h-[620px]">
              <FleetRadarMap
                initialRiders={pipelineData.riders}
                initialOrders={pipelineData.orders}
              />
            </div>

            {/* 2. Priority Pipeline Row */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-text flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">view_kanban</span>
                  Quick Waybill Pipeline (Unassigned Priority)
                </h3>
                <button
                  onClick={() => changeTab('waybills')}
                  className="text-xs font-bold text-primary hover:underline uppercase flex items-center gap-1 cursor-pointer"
                >
                  Full Waybill Board
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
              {loading ? (
                <div className="h-48 flex items-center justify-center border border-border bg-surface-elevated text-xs text-text-muted animate-pulse">
                  Loading live pipeline records...
                </div>
              ) : (
                <WaybillPipeline
                  initialOrders={pipelineData.orders}
                  riders={pipelineData.riders}
                  onRefresh={fetchPipeline}
                />
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'waybills' && (
          <motion.div
            key="waybills"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="h-64 flex items-center justify-center border border-border bg-surface-elevated text-xs text-text-muted animate-pulse">
                Loading waybills...
              </div>
            ) : (
              <WaybillPipeline
                initialOrders={pipelineData.orders}
                riders={pipelineData.riders}
                onRefresh={fetchPipeline}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'riders' && (
          <motion.div
            key="riders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <RiderOperationsTab riders={pipelineData.riders} onRefresh={fetchPipeline} />
          </motion.div>
        )}

        {activeTab === 'ledger' && (
          <motion.div
            key="ledger"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <FinancialLedgerTab orders={pipelineData.orders} onRefresh={fetchPipeline} />
          </motion.div>
        )}

        {activeTab === 'telemetry' && (
          <motion.div
            key="telemetry"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SystemHealthTab />
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AdminChatInboxTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminDashboardLayout>
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center text-xs text-text-muted animate-pulse font-mono">
            Loading Admin Control Tower...
          </div>
        }
      >
        <AdminPageContent />
      </Suspense>
    </AdminDashboardLayout>
  );
}
