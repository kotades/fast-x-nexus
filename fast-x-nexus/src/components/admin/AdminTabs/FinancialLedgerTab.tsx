'use client';

/**
 * /src/components/admin/AdminTabs/FinancialLedgerTab.tsx
 * Fast X Nexus — Enterprise Financial Ledger & 70/30 Escrow Split
 *
 * Provides authoritative escrow pool balancing, live GMV tracking,
 * 70% courier payout / 30% Fast X margin allocations, and CSV export.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getAdminFinancialStats } from '@/app/actions/admin';

interface LedgerOrder {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  pickup_name?: string;
  dropoff_name?: string;
  rider_id?: string;
}

interface FinancialLedgerTabProps {
  orders: LedgerOrder[];
  onRefresh?: () => void;
}

export function FinancialLedgerTab({ orders, onRefresh }: FinancialLedgerTabProps) {
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'IN_ESCROW' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load authoritative server financial statistics
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getAdminFinancialStats();
      if (res.success) {
        setStatsData(res);
      }
    } catch (e) {
      console.warn('[FinancialLedgerTab] Failed to fetch server financial stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [orders]);

  // Local fallback calculations
  const validOrders = useMemo(() => orders.filter((o) => o.status !== 'CANCELLED'), [orders]);
  const localGMV = useMemo(
    () => validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    [validOrders]
  );
  const localRiderEscrow = Math.round(localGMV * 0.7);
  const localPlatformGross = localGMV - localRiderEscrow;

  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'DELIVERED'), [orders]);
  const localDisbursed = useMemo(
    () =>
      completedOrders.reduce(
        (sum, o) => sum + Math.round((Number(o.total_amount) || 0) * 0.7),
        0
      ),
    [completedOrders]
  );
  const localActiveEscrow = localRiderEscrow - localDisbursed;

  // Use authoritative stats if available, otherwise fallback to local
  const totalGMV = statsData?.totalGMV ?? localGMV;
  const totalRiderEscrow = statsData?.riderEscrowPool ?? localRiderEscrow;
  const totalPlatformGross = statsData?.platformGrossRevenue ?? localPlatformGross;
  const activeEscrowHolding = statsData?.data?.activeEscrowHolding ?? localActiveEscrow;
  const dailyGMV = statsData?.dailyRevenue ?? 0;
  const weeklyGMV = statsData?.weeklyRevenue ?? 0;

  // Filtered & Searched Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (filter === 'COMPLETED' && o.status !== 'DELIVERED') return false;
      if (
        filter === 'IN_ESCROW' &&
        !['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)
      )
        return false;
      if (filter === 'CANCELLED' && o.status !== 'CANCELLED') return false;

      // 2. Search Query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const code = `fx-${o.id.slice(0, 8)}`.toLowerCase();
        const idMatch = o.id.toLowerCase().includes(query) || code.includes(query);
        const senderMatch = (o.pickup_name || '').toLowerCase().includes(query);
        const recipientMatch = (o.dropoff_name || '').toLowerCase().includes(query);
        return idMatch || senderMatch || recipientMatch;
      }

      return true;
    });
  }, [orders, filter, searchQuery]);

  // Export to CSV Functionality
  const handleExportCSV = () => {
    const headers = [
      'Waybill ID',
      'Created Date',
      'Sender',
      'Recipient',
      'Status',
      'Gross Amount (NGN)',
      'Courier Escrow 70% (NGN)',
      'Fast X Platform 30% (NGN)',
    ];

    const rows = filteredOrders.map((o) => {
      const amount = Number(o.total_amount) || 0;
      const riderCut = o.status === 'CANCELLED' ? 0 : Math.round(amount * 0.7);
      const platformCut = o.status === 'CANCELLED' ? 0 : amount - riderCut;
      return [
        `FX-${o.id.slice(0, 8).toUpperCase()}`,
        new Date(o.created_at).toISOString(),
        `"${(o.pickup_name || 'Sender').replace(/"/g, '""')}"`,
        `"${(o.dropoff_name || 'Recipient').replace(/"/g, '""')}"`,
        o.status,
        amount,
        riderCut,
        platformCut,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fastx_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-elevated border border-border border-l-4 border-l-primary p-4 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
            Total GMV (Turnover)
          </span>
          <p className="text-2xl font-black text-text">₦{totalGMV.toLocaleString('en-NG')}</p>
          <p className="text-[10px] text-text-muted">
            24h: ₦{dailyGMV.toLocaleString('en-NG')} • 7d: ₦{weeklyGMV.toLocaleString('en-NG')}
          </p>
        </div>

        <div className="bg-surface-elevated border border-border border-l-4 border-l-blue-500 p-4 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
            Rider Escrow Pool (70%)
          </span>
          <p className="text-2xl font-black text-blue-600">
            ₦{totalRiderEscrow.toLocaleString('en-NG')}
          </p>
          <p className="text-[10px] text-text-muted">
            Settled payouts: ₦{localDisbursed.toLocaleString('en-NG')}
          </p>
        </div>

        <div className="bg-surface-elevated border border-border border-l-4 border-l-emerald-500 p-4 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
            Platform Margin (30%)
          </span>
          <p className="text-2xl font-black text-emerald-600">
            ₦{totalPlatformGross.toLocaleString('en-NG')}
          </p>
          <p className="text-[10px] text-text-muted">Fast X net gross take-rate</p>
        </div>

        <div className="bg-surface-elevated border border-border border-l-4 border-l-amber-500 p-4 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">
            Active Escrow Holding
          </span>
          <p className="text-2xl font-black text-amber-600">
            ₦{activeEscrowHolding.toLocaleString('en-NG')}
          </p>
          <p className="text-[10px] text-text-muted">Held pending delivery confirmation</p>
        </div>
      </div>

      {/* Filter Tabs, Search & Export */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface-elevated border border-border p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search waybill code or parties..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          {(['ALL', 'COMPLETED', 'IN_ESCROW', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${
                filter === tab
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Export & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-surface border border-border hover:border-primary text-xs text-text hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV report"
          >
            <span className="material-symbols-outlined text-xs">download</span>
            Export CSV
          </button>

          <button
            onClick={() => {
              fetchStats();
              onRefresh?.();
            }}
            className="px-3 py-1.5 bg-surface border border-border text-xs text-text-muted hover:text-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-surface-elevated border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-low border-b border-border text-[10px] font-bold text-text-dim uppercase tracking-wider">
              <tr>
                <th className="p-3">Waybill Code</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Parties</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Gross GMV</th>
                <th className="p-3 text-right">Rider Cut (70%)</th>
                <th className="p-3 text-right">Platform (30%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    No transactions found matching &quot;{filter}&quot;
                    {searchQuery ? ` and search &quot;${searchQuery}&quot;` : ''}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const amount = Number(o.total_amount) || 0;
                  const riderCut = Math.round(amount * 0.7);
                  const platformCut = amount - riderCut;
                  const isDelivered = o.status === 'DELIVERED';
                  const isCancelled = o.status === 'CANCELLED';

                  return (
                    <tr key={o.id} className="hover:bg-surface-dim transition-colors">
                      <td className="p-3 font-bold text-text">
                        FX-{o.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3 text-text-muted text-[11px]">
                        {new Date(o.created_at).toLocaleDateString()}{' '}
                        {new Date(o.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 text-text-muted text-[11px]">
                        <span className="text-text font-bold">{o.pickup_name || 'Sender'}</span>
                        <span className="mx-1">→</span>
                        <span>{o.dropoff_name || 'Recipient'}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isDelivered
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                              : isCancelled
                              ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                          }`}
                        >
                          {isDelivered ? 'SETTLED' : isCancelled ? 'REFUNDED' : 'ESCROW HOLD'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-text">
                        ₦{amount.toLocaleString('en-NG')}
                      </td>
                      <td className="p-3 text-right font-bold text-blue-600">
                        {isCancelled ? '₦0' : `₦${riderCut.toLocaleString('en-NG')}`}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {isCancelled ? '₦0' : `₦${platformCut.toLocaleString('en-NG')}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
