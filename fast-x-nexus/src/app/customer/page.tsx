/**
 * Dashboard Page — Fast X Nexus Customer Dashboard
 *
 * Wraps the customer dashboard layout with the state provider
 * and renders the active view (Command Map / Booking Wizard / Activity Ledger).
 */

import { CustomerDashboardLayout } from '@/components/layouts/CustomerDashboardLayout';
import { DashboardContent } from './DashboardContent';

export default function DashboardPage() {
  return (
    <CustomerDashboardLayout>
      <DashboardContent />
    </CustomerDashboardLayout>
  );
}
