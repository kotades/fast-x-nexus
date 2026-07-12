'use client';

/**
 * RiderDashboardContext — State-Driven UI Controller for Rider Terminal
 *
 * Manages: activeView, activeJob, earningsPeriod, jobPoolFilters
 * Design pattern mirrors CustomerDashboardContext.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type RiderDashboardView = 'job_pool' | 'active_jobs' | 'earnings' | 'profile';
export type EarningsPeriod = 'daily' | 'weekly' | 'monthly';

export interface RiderJob {
  id: string;
  orderId: string;
  pickup: string;
  dropoff: string;
  earnings: number;
  distance: string;
  status: 'available' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  customerName: string;
  eta?: string;
  progress: number;
  createdAt: string;
}

interface RiderDashboardState {
  activeView: RiderDashboardView;
  activeJob: RiderJob | null;
  earningsPeriod: EarningsPeriod;
  isLoading: boolean;
}

interface RiderDashboardActions {
  setActiveView: (view: RiderDashboardView) => void;
  setActiveJob: (job: RiderJob | null) => void;
  setEarningsPeriod: (period: EarningsPeriod) => void;
  navigateTo: (view: RiderDashboardView) => void;
  acceptJob: (jobId: string) => void;
}

type RiderDashboardContextType = RiderDashboardState & RiderDashboardActions;

const RiderDashboardContext = createContext<RiderDashboardContextType | undefined>(undefined);

export function RiderDashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<RiderDashboardView>('job_pool');
  const [activeJob, setActiveJob] = useState<RiderJob | null>(null);
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>('weekly');
  const [isLoading, setIsLoading] = useState(false);

  const navigateTo = useCallback((view: RiderDashboardView) => {
    setActiveView(view);
  }, []);

  const acceptJob = useCallback((jobId: string) => {
    console.log(`[RiderDashboard] Job accepted: ${jobId}`);
    // Future: call server action to accept job
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  const value = useMemo<RiderDashboardContextType>(
    () => ({
      activeView,
      activeJob,
      earningsPeriod,
      isLoading,
      setActiveView,
      setActiveJob,
      setEarningsPeriod,
      navigateTo,
      acceptJob,
    }),
    [activeView, activeJob, earningsPeriod, isLoading, navigateTo, acceptJob]
  );

  return (
    <RiderDashboardContext.Provider value={value}>
      {children}
    </RiderDashboardContext.Provider>
  );
}

export function useRiderDashboard() {
  const context = useContext(RiderDashboardContext);
  if (!context) {
    throw new Error('useRiderDashboard must be used within a RiderDashboardProvider');
  }
  return context;
}

/** Safe version that returns null instead of throwing — for use in shared components like Sidebar */
export function useRiderDashboardSafe() {
  try {
    return useRiderDashboard();
  } catch {
    return null;
  }
}
