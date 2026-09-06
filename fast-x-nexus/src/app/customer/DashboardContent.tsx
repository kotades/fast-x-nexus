'use client';

/**
 * DashboardContent — Instant zero-delay view router for Customer Dashboard
 */

import React from 'react';
import { DashboardShell } from './DashboardShell';
import { CommandMap } from '@/components/customer/CommandMap/CommandMap';
import { BookingWizard } from '@/components/customer/BookingWizard/BookingWizard';
import { ActivityLedger } from '@/components/customer/ActivityLedger/ActivityLedger';
import { ProfilePage } from '@/components/customer/Profile/ProfilePage';

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