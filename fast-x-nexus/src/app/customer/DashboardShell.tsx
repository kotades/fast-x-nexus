'use client';

/**
 * DashboardShell — View Router
 *
 * Renders the active view based on CustomerDashboardContext.
 * Handles AnimatePresence transitions between views.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';

interface DashboardShellProps {
  commandMap: React.ReactNode;
  bookingWizard: React.ReactNode;
  activityLedger: React.ReactNode;
  profile: React.ReactNode;
}

const viewVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function DashboardShell({ commandMap, bookingWizard, activityLedger, profile }: DashboardShellProps) {
  const { activeView } = useCustomerDashboard();

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 overflow-y-auto"
        >
          {activeView === 'command_map' && commandMap}
          {activeView === 'booking_wizard' && bookingWizard}
          {activeView === 'activity_ledger' && activityLedger}
          {activeView === 'profile' && profile}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
