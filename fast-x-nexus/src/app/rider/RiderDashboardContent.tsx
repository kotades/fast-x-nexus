'use client';

/**
 * RiderDashboardContent — Instant zero-delay view router for Rider Terminal
 */

import React from 'react';
import { RiderDashboardShell } from '@/components/rider/shared/RiderDashboardShell';
import { JobPool } from '@/components/rider/JobPool/JobPool';
import { ActiveJobs } from '@/components/rider/ActiveJobs/ActiveJobs';
import { RiderRouteMap } from '@/components/rider/RouteMap/RiderRouteMap';
import { EarningsPage } from '@/components/rider/Earnings/EarningsPage';
import { ProfilePage } from '@/components/customer/Profile/ProfilePage';

export function RiderDashboardContent() {
  return (
    <RiderDashboardShell
      jobPool={<JobPool />}
      activeJobs={<ActiveJobs />}
      routeMap={<RiderRouteMap />}
      earnings={<EarningsPage />}
      profile={<ProfilePage />}
    />
  );
}