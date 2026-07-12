'use client';

/**
 * ActivityLedger — Tabbed View: Shipping History | Financial Ledger
 *
 * Tab switching with Framer Motion layout animation (animated underline).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { ShippingHistory } from './ShippingHistory';

const TABS = [
  { id: 'shipping' as const, label: 'Shipping History', icon: 'local_shipping' },
  { id: 'financial' as const, label: 'Financial Ledger', icon: 'account_balance' },
];

export function ActivityLedger() {
  const { ledgerTab, setLedgerTab } = useCustomerDashboard();

  return (
    <div className="p-4 md:p-6 bg-surface-bright min-h-full">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text tracking-tight">Activity Ledger</h2>
          <p className="text-sm text-text-muted">Review historical shipments and financial transactions.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-surface border border-border">
          {TABS.map((tab) => {
            const isActive = ledgerTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setLedgerTab(tab.id)}
                className={`
                  relative px-5 py-2.5 text-xs font-bold uppercase tracking-widest
                  transition-all duration-[var(--duration-200)]
                  ${isActive ? 'text-primary' : 'text-text-muted hover:text-text'}
                `}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="ledger-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <motion.div
        key={ledgerTab}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {ledgerTab === 'shipping' && <ShippingHistory />}
        {ledgerTab === 'financial' && (
          <div className="text-center py-16 text-text-muted">
            <span className="material-symbols-outlined text-4xl mb-4" aria-hidden="true">account_balance</span>
            <p className="text-lg font-semibold">Financial Ledger</p>
            <p className="text-sm mt-2">Transaction history and balance tracking</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}