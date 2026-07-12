/**
 * Rider Dashboard Page — Fast X Nexus Rider Terminal
 *
 * Wraps the rider dashboard layout with the state provider
 * and renders the active view (Job Pool / Active Jobs / Earnings / Profile).
 */

import { RiderDashboardLayout } from '@/components/layouts/RiderDashboardLayout';
import { RiderDashboardProvider } from '@/components/rider/contexts/RiderDashboardContext';
import { RiderDashboardContent } from './RiderDashboardContent';

export default function RiderPage() {
  return (
    <RiderDashboardProvider>
      <RiderDashboardLayout>
        <RiderDashboardContent />
      </RiderDashboardLayout>
    </RiderDashboardProvider>
  );
}