'use client';

/**
 * /src/app/customer/DashboardShell.tsx
 * Fast X Nexus — Customer Dashboard View Router
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
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 h-full overflow-hidden flex flex-col"
        >
          {activeView === 'command_map' && commandMap}
          {activeView === 'booking_wizard' && (
            <div className="flex-1 h-full overflow-hidden flex flex-col">
              {bookingWizard}
            </div>
          )}
          {activeView === 'activity_ledger' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {activityLedger}
            </div>
          )}
          {activeView === 'profile' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {profile}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
