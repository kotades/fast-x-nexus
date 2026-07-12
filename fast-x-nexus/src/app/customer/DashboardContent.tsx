'use client';

/**
 * DashboardContent — Client-side view router with dynamic map imports
 *
 * Handles SSR-safe dynamic imports for Leaflet-based components.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { DashboardShell } from './DashboardShell';

const CommandMap = dynamic(
  () => import('@/components/customer/CommandMap/CommandMap').then((mod) => ({ default: mod.CommandMap })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
            Loading Command Map...
          </span>
        </div>
      </div>
    ),
  }
);

const BookingWizard = dynamic(
  () => import('@/components/customer/BookingWizard/BookingWizard').then((mod) => ({ default: mod.BookingWizard })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading booking engine...
        </span>
      </div>
    ),
  }
);

const ActivityLedger = dynamic(
  () => import('@/components/customer/ActivityLedger/ActivityLedger').then((mod) => ({ default: mod.ActivityLedger })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-surface-dim flex items-center justify-center min-h-[600px]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted animate-pulse-soft">
          Loading ledger...
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

export function DashboardContent() {
  return (
    <DashboardShell
      commandMap={<CommandMap />}
      bookingWizard={<BookingWizard />}
      activityLedger={<ActivityLedger />}
      profile={<ProfilePage />}
    />
  );
}