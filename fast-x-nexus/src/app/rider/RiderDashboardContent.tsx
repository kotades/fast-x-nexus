'use client';

/**
 * RiderDashboardContent — Client-side view router with dynamic imports
 *
 * Handles SSR-safe dynamic imports for Rider views.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { RiderDashboardShell } from '@/components/rider/shared/RiderDashboardShell';

const JobPool = dynamic(
  () => import('@/components/rider/JobPool/JobPool').then((mod) => ({ default: mod.JobPool })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading jobs...
        </span>
      </div>
    ),
  }
);

const ActiveJobs = dynamic(
  () => import('@/components/rider/ActiveJobs/ActiveJobs').then((mod) => ({ default: mod.ActiveJobs })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading waybill...
        </span>
      </div>
    ),
  }
);

const EarningsPage = dynamic(
  () => import('@/components/rider/Earnings/EarningsPage').then((mod) => ({ default: mod.EarningsPage })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading earnings...
        </span>
      </div>
    ),
  }
);

const ProfilePage = dynamic(
  () => import('@/components/customer/Profile/ProfilePage').then((mod) => ({ default: mod.ProfilePage })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading profile...
        </span>
      </div>
    ),
  }
);

export function RiderDashboardContent() {
  return (
    <RiderDashboardShell
      jobPool={<JobPool />}
      activeJobs={<ActiveJobs />}
      earnings={<EarningsPage />}
      profile={<ProfilePage />}
    />
  );
}