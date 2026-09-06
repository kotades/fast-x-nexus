'use client';

/**
 * /src/components/rider/Earnings/EarningsPage.tsx
 * Fast X Nexus — Real-Time Rider Earnings & Performance View
 *
 * Connects to live PostgreSQL ledgers & orders via getRiderEarnings server action.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRiderEarnings, type RiderEarningsSummary } from '@/app/actions/rider';
import { Skeleton } from '@/components/customer/shared/Skeleton';

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="text-2xl font-black text-text"
    >
      {prefix}{value.toLocaleString('en-NG')}
    </motion.span>
  );
}

export function EarningsPage() {
  const [earnings, setEarnings] = useState<RiderEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    setLoading(true);
    const res = await getRiderEarnings();
    if (res.success && res.data) {
      setEarnings(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 font-mono">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-elevated border border-border p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const data = earnings || {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    jobsCompleted: 0,
    acceptanceRate: 100,
    rating: 5.0,
    weeklyBreakdown: [
      { day: 'Mon', amount: 0 },
      { day: 'Tue', amount: 0 },
      { day: 'Wed', amount: 0 },
      { day: 'Thu', amount: 0 },
      { day: 'Fri', amount: 0 },
      { day: 'Sat', amount: 0 },
      { day: 'Sun', amount: 0 },
    ],
  };

  const maxAmount = Math.max(...data.weeklyBreakdown.map((d) => d.amount), 1000);

  return (
    <div className="p-4 md:p-6 space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
            FINANCIALS / LEDGER
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-text">
            Rider Earnings
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Automated Escrow & Direct Payout Performance
          </p>
        </div>

        <button
          onClick={fetchEarnings}
          className="px-3 py-1.5 bg-surface border border-border text-xs font-bold text-text-muted hover:text-text uppercase flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-xs">refresh</span>
          Refresh Balance
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-surface-elevated border border-border border-l-4 border-l-primary p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Today</p>
          <AnimatedCounter value={data.today} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface-elevated border border-border border-l-4 border-l-primary p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">This Week</p>
          <AnimatedCounter value={data.thisWeek} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-elevated border border-border border-l-4 border-l-primary p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">This Month</p>
          <AnimatedCounter value={data.thisMonth} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface-elevated border border-border border-l-4 border-l-amber-500 p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">In Escrow (Pending)</p>
          <AnimatedCounter value={data.pending} prefix="₦" />
        </motion.div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-surface-elevated border border-border p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text">Weekly Payout Trajectory</h3>
          <span className="text-[10px] text-text-dim uppercase">70% Platform Commission Split</span>
        </div>

        <div className="flex items-end justify-between gap-2 h-36 pt-4 border-b border-border">
          {data.weeklyBreakdown.map((day, i) => {
            const heightPct = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-text-muted">
                  {day.amount > 0 ? `₦${(day.amount / 1000).toFixed(0)}k` : ''}
                </span>
                <motion.div
                  className="w-full max-w-[36px] bg-primary hover:bg-primary/80 transition-colors"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, 6)}%` }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 100, damping: 20 }}
                />
                <span className="text-[10px] font-mono text-text-muted">{day.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated border border-border p-4 text-center">
          <p className="text-3xl font-black text-primary">{data.jobsCompleted}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Jobs Completed</p>
        </div>
        <div className="bg-surface-elevated border border-border p-4 text-center">
          <p className="text-3xl font-black text-emerald-400">{data.acceptanceRate}%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Acceptance Rate</p>
        </div>
        <div className="bg-surface-elevated border border-border p-4 text-center">
          <p className="text-3xl font-black text-primary">{data.rating.toFixed(1)}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Driver Rating</p>
        </div>
      </div>
    </div>
  );
}