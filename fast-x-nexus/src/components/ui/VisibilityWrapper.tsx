'use client';

/**
 * /src/components/ui/VisibilityWrapper.tsx
 * Fast X Nexus — Role-Based Component Visibility Enforcer
 *
 * This wrapper is the "Component Visibility Matrix" in code form.
 * Pass a `roles` prop listing which user roles are ALLOWED to see children.
 * If the current auth context role does NOT match, the component returns null
 * (strict DOM-level restriction — not CSS hidden, truly not rendered).
 *
 * Usage:
 *   <VisibilityWrapper roles={['rider', 'admin']}>
 *     <RiderJobFeed />
 *   </VisibilityWrapper>
 */

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type UserRole = 'admin' | 'vendor' | 'rider' | 'customer' | 'guest';

interface VisibilityWrapperProps {
  /** Roles allowed to see this content. Pass ['guest'] for unauthenticated users only. */
  roles: UserRole[];
  children: React.ReactNode;
  /** Optional fallback element to render if role does not match */
  fallback?: React.ReactNode;
}

export function VisibilityWrapper({
  roles,
  children,
  fallback = null,
}: VisibilityWrapperProps) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCurrentRole('guest');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setCurrentRole((profile?.role as UserRole) ?? 'guest');
      setLoading(false);
    }

    fetchRole();
  }, []);

  // While loading, render nothing to prevent flash of restricted content
  if (loading) return null;

  // Strict DOM restriction — not rendered if role is not in allowed list
  if (!currentRole || !roles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ComponentRegistry — maps component names to their allowed roles.
 * Use this as the single source of truth for what each role can see.
 */
export const ComponentRegistry: Record<string, UserRole[]> = {
  // Navigation
  'GlobalLandingHeader':    ['guest'],
  'DashboardSidebar':       ['customer', 'rider', 'vendor', 'admin'],
  'AdminNav':               ['admin'],

  // Dashboard Hubs
  'CustomerBookingWizard':  ['customer'],
  'RiderJobFeed':           ['rider'],
  'VendorOrderPanel':       ['vendor'],
  'AdminControlTower':      ['admin'],

  // Shared dashboard components
  'WalletWidget':           ['customer', 'vendor', 'rider'],
  'PayoutBalance':          ['rider'],
  'AdminLedgerView':        ['admin'],

  // Action gates
  'BookingConfirmModal':    ['customer', 'vendor'],
  'OrderAcceptModal':       ['rider'],
  'RefundActionButton':     ['admin'],
};
