'use client';

/**
 * /src/components/navigation/MobileBottomNav.tsx
 * Fast X Nexus — Native Mobile Bottom Navigation Bar
 *
 * Replaces the desktop sidebar on mobile screens (md:hidden) with a sleek,
 * tactile bottom menu matching modern mobile logistics applications.
 *
 * Supports role-based tabs:
 * - Customer: Map, Book, Activity, Profile
 * - Rider: Pool, Active, Dispatch, Earnings, Profile
 * - Admin: Radar, Waybills, Fleet, Escrow, Comms
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCustomerDashboardSafe,
  type DashboardView,
} from '@/components/customer/contexts/CustomerDashboardContext';
import {
  useRiderDashboardSafe,
  type RiderDashboardView,
} from '@/components/rider/contexts/RiderDashboardContext';

interface MobileBottomNavProps {
  role?: 'customer' | 'rider' | 'admin';
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const customerCtx = useCustomerDashboardSafe();
  const customerActiveView = customerCtx?.activeView;
  const customerNavigateTo = customerCtx?.navigateTo;

  const riderCtx = useRiderDashboardSafe();
  const riderActiveView = riderCtx?.activeView;
  const riderNavigateTo = riderCtx?.navigateTo;

  const [adminActiveTab, setAdminActiveTab] = useState<string>('radar');
  const [adminCounts, setAdminCounts] = useState<{ waybills?: number; riders?: number }>({});

  // Sync Admin Tab with URL/Custom Events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t) setAdminActiveTab(t);
    }

    const handleSetTab = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.tab) setAdminActiveTab(custom.detail.tab);
    };

    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setAdminActiveTab(params.get('tab') || 'radar');
      }
    };

    const handleUpdateCounts = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setAdminCounts((prev) => ({ ...prev, ...custom.detail }));
      }
    };

    window.addEventListener('fastx:admin:set_tab', handleSetTab);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('fastx:admin:update_counts', handleUpdateCounts);

    return () => {
      window.removeEventListener('fastx:admin:set_tab', handleSetTab);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('fastx:admin:update_counts', handleUpdateCounts);
    };
  }, []);

  // Determine active role if not provided
  const resolvedRole =
    role ||
    (pathname.startsWith('/customer')
      ? 'customer'
      : pathname.startsWith('/rider')
      ? 'rider'
      : pathname.startsWith('/admin')
      ? 'admin'
      : 'customer');

  // Customer Navigation Items
  const customerItems: (NavItem & { view: DashboardView })[] = [
    { id: 'command_map', label: 'Map', icon: 'explore', view: 'command_map' },
    { id: 'booking_wizard', label: 'Book', icon: 'add_circle', view: 'booking_wizard' },
    { id: 'activity_ledger', label: 'Activity', icon: 'receipt_long', view: 'activity_ledger' },
    { id: 'profile', label: 'Profile', icon: 'person', view: 'profile' },
  ];

  // Rider Navigation Items
  const riderItems: (NavItem & { view: RiderDashboardView })[] = [
    { id: 'job_pool', label: 'Pool', icon: 'inventory_2', view: 'job_pool' },
    { id: 'active_jobs', label: 'Active', icon: 'two_wheeler', view: 'active_jobs' },
    { id: 'route_map', label: 'Dispatch', icon: 'navigation', view: 'route_map' },
    { id: 'earnings', label: 'Earnings', icon: 'payments', view: 'earnings' },
    { id: 'profile', label: 'Profile', icon: 'badge', view: 'profile' },
  ];

  // Admin Navigation Items
  const adminItems: (NavItem & { tab: string })[] = [
    { id: 'radar', label: 'Radar', icon: 'radar', tab: 'radar' },
    {
      id: 'waybills',
      label: 'Waybills',
      icon: 'view_kanban',
      tab: 'waybills',
      badge: adminCounts.waybills,
    },
    {
      id: 'riders',
      label: 'Fleet',
      icon: 'two_wheeler',
      tab: 'riders',
      badge: adminCounts.riders,
    },
    { id: 'ledger', label: 'Escrow', icon: 'account_balance', tab: 'ledger' },
    { id: 'chat', label: 'Comms', icon: 'forum', tab: 'chat' },
  ];

  if (resolvedRole === 'customer') {
    return (
      <nav
        aria-label="Mobile Customer Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] md:hidden h-14 sm:h-15 px-2 flex items-center justify-around select-none"
      >
        {customerItems.map((item) => {
          const isActive = pathname.startsWith('/customer') && customerActiveView === item.view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!pathname.startsWith('/customer')) {
                  router.push('/customer');
                }
                customerNavigateTo?.(item.view);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors relative ${
                isActive
                  ? 'text-[#347227] font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined transition-transform duration-200 text-[21px] ${
                    isActive ? 'scale-110 text-[#347227]' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                {item.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="activeCustomerNavIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-[#347227] rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  if (resolvedRole === 'rider') {
    return (
      <nav
        aria-label="Mobile Rider Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] md:hidden h-14 sm:h-15 px-2 flex items-center justify-around select-none"
      >
        {riderItems.map((item) => {
          const isActive = pathname.startsWith('/rider') && riderActiveView === item.view;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (!pathname.startsWith('/rider')) {
                  router.push('/rider');
                }
                riderNavigateTo?.(item.view);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors relative ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined transition-transform duration-200 text-[21px] ${
                    isActive ? 'scale-110 text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                {item.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="activeRiderNavIndicator"
                  className="absolute top-0 w-8 h-0.5 bg-emerald-700 rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // Admin Navigation
  return (
    <nav
      aria-label="Mobile Admin Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] md:hidden h-14 sm:h-15 px-2 flex items-center justify-around select-none"
    >
      {adminItems.map((item) => {
        const isActive = pathname === '/admin' && adminActiveTab === item.tab;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setAdminActiveTab(item.tab);
              if (pathname === '/admin') {
                window.dispatchEvent(
                  new CustomEvent('fastx:admin:set_tab', { detail: { tab: item.tab } })
                );
                window.history.pushState(null, '', `/admin?tab=${item.tab}`);
              } else {
                router.push(`/admin?tab=${item.tab}`);
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors relative ${
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`material-symbols-outlined transition-transform duration-200 text-[21px] ${
                  isActive ? 'scale-110 text-emerald-700' : 'text-slate-400'
                }`}
              >
                {item.icon}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-1 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-tight mt-0.5">
              {item.label}
            </span>
            {isActive && (
              <motion.span
                layoutId="activeAdminNavIndicator"
                className="absolute top-0 w-8 h-0.5 bg-emerald-700 rounded-full"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
