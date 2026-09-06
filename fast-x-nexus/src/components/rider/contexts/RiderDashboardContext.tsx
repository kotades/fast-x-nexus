'use client';

/**
 * RiderDashboardContext — State-Driven UI Controller for Rider Terminal
 *
 * Manages: activeView, activeJob, earningsPeriod, jobPoolFilters
 * Design pattern mirrors CustomerDashboardContext.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getActiveRiderJobs } from '@/app/actions/rider';

export type RiderDashboardView = 'job_pool' | 'active_jobs' | 'route_map' | 'earnings' | 'profile';
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

function getInitialRiderView(): RiderDashboardView {
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('fastx_rider_active_view');
      if (saved && ['job_pool', 'active_jobs', 'route_map', 'earnings', 'profile'].includes(saved)) {
        return saved as RiderDashboardView;
      }
    } catch {}
  }
  return 'job_pool';
}

export function RiderDashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<RiderDashboardView>(getInitialRiderView);
  const [activeJob, setActiveJob] = useState<RiderJob | null>(null);
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>('weekly');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If rider has an active delivery in progress and no view is manually stored, auto-open Dispatch Map
    async function checkActiveDuty() {
      const res = await getActiveRiderJobs();
      if (res.success && res.data && res.data.length > 0) {
        const saved = typeof window !== 'undefined' ? sessionStorage.getItem('fastx_rider_active_view') : null;
        if (!saved || saved === 'job_pool') {
          setActiveView('route_map');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('fastx_rider_active_view', 'route_map');
          }
        }
      }
    }
    checkActiveDuty();
  }, []);

  const navigateTo = useCallback((view: RiderDashboardView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('fastx_rider_active_view', view);
      } catch {}
    }
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
