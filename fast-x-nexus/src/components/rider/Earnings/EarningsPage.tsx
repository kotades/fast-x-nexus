'use client';

/**
 * EarningsPage — Earnings & Performance View for Rider Terminal
 *
 * Displays payout summaries, weekly breakdown, and performance stats.
 * Built from Stitch design: Earning&Performance.html
 */

import React from 'react';
import { motion } from 'framer-motion';

const mockEarnings = {
  today: 8500,
  thisWeek: 45200,
  thisMonth: 189500,
  pending: 3200,
  jobsCompleted: 28,
  acceptanceRate: 94,
  rating: 4.8,
  weeklyBreakdown: [
    { day: 'Mon', amount: 6200 },
    { day: 'Tue', amount: 7800 },
    { day: 'Wed', amount: 5400 },
    { day: 'Thu', amount: 9100 },
    { day: 'Fri', amount: 8700 },
    { day: 'Sat', amount: 8000 },
    { day: 'Sun', amount: 0 },
  ],
};

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="text-2xl font-black"
    >
      {prefix}{value.toLocaleString()}
    </motion.span>
  );
}

export function EarningsPage() {
  const earnings = mockEarnings;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-text">Earnings</h1>
        <p className="text-xs font-mono text-text-muted mt-1">Your performance overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white border-2 border-border p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Today</p>
          <AnimatedCounter value={earnings.today} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border-2 border-border p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">This Week</p>
          <AnimatedCounter value={earnings.thisWeek} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-2 border-border p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">This Month</p>
          <AnimatedCounter value={earnings.thisMonth} prefix="₦" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border-2 border-border p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Pending</p>
          <AnimatedCounter value={earnings.pending} prefix="₦" />
        </motion.div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white border-2 border-border p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text mb-4">This Week</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {earnings.weeklyBreakdown.map((day, i) => {
            const maxAmount = Math.max(...earnings.weeklyBreakdown.map(d => d.amount));
            const heightPct = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  className="w-full bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 100, damping: 20 }}
                  style={{ minHeight: day.amount > 0 ? '4px' : '0' }}
                />
                <span className="text-[10px] font-mono text-text-muted">{day.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border-2 border-border p-4 text-center">
          <p className="text-3xl font-black text-primary">{earnings.jobsCompleted}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Jobs Done</p>
        </div>
        <div className="bg-white border-2 border-border p-4 text-center">
          <p className="text-3xl font-black text-secondary">{earnings.acceptanceRate}%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Acceptance</p>
        </div>
        <div className="bg-white border-2 border-border p-4 text-center">
          <p className="text-3xl font-black text-primary">{earnings.rating}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">Rating</p>
        </div>
      </div>
    </div>
  );
}