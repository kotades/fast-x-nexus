'use client';

/**
 * RiderDashboardShell — View Router for Rider Terminal
 *
 * Renders the active view based on RiderDashboardContext.
 * Handles AnimatePresence transitions between views with spring physics.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRiderDashboard } from '@/components/rider/contexts/RiderDashboardContext';

interface RiderDashboardShellProps {
  jobPool: React.ReactNode;
  activeJobs: React.ReactNode;
  earnings: React.ReactNode;
  profile: React.ReactNode;
}

const viewVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function RiderDashboardShell({ jobPool, activeJobs, earnings, profile }: RiderDashboardShellProps) {
  const { activeView } = useRiderDashboard();

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
          {activeView === 'job_pool' && jobPool}
          {activeView === 'active_jobs' && activeJobs}
          {activeView === 'earnings' && earnings}
          {activeView === 'profile' && profile}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}