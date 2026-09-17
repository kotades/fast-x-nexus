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
  routeMap: React.ReactNode;
  earnings: React.ReactNode;
  profile: React.ReactNode;
}

const viewVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function RiderDashboardShell({ jobPool, activeJobs, routeMap, earnings, profile }: RiderDashboardShellProps) {
  const { activeView } = useRiderDashboard();

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 h-full overflow-hidden flex flex-col"
        >
          {activeView === 'route_map' && routeMap}
          {activeView === 'job_pool' && (
            <div className="flex-1 h-full overflow-y-auto pt-16 sm:pt-18">{jobPool}</div>
          )}
          {activeView === 'active_jobs' && (
            <div className="flex-1 h-full overflow-y-auto pt-16 sm:pt-18">{activeJobs}</div>
          )}
          {activeView === 'earnings' && (
            <div className="flex-1 h-full overflow-y-auto pt-16 sm:pt-18">{earnings}</div>
          )}
          {activeView === 'profile' && (
            <div className="flex-1 h-full overflow-y-auto pt-16 sm:pt-18">{profile}</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}