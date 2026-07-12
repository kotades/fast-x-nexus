'use client';

/**
 * Sidebar — Refactored with Framer Motion + Design Tokens
 *
 * Swiss-styled minimal navigation bar with spring physics active highlights,
 * semantic design tokens, and Material Symbols.
 *
 * Now uses useRouter for cross-route navigation: when clicking a customer
 * nav item while on /rider, it first pushes to /customer, then switches view.
 */

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCustomerDashboardSafe, type DashboardView } from '@/components/customer/contexts/CustomerDashboardContext';
import { useRiderDashboardSafe, type RiderDashboardView } from '@/components/rider/contexts/RiderDashboardContext';

const navItems = {
  customer: [
    { label: 'Dashboard', icon: 'dashboard', view: 'command_map' as DashboardView, route: '/customer' },
    { label: 'Bookings', icon: 'event_note', view: 'booking_wizard' as DashboardView, route: '/customer' },
    { label: 'History', icon: 'history', view: 'activity_ledger' as DashboardView, route: '/customer' },
    { label: 'Profile', icon: 'person', view: 'profile' as DashboardView, route: '/customer' },
  ],
  rider: [
    { label: 'Job Pool', icon: 'work_history', view: 'job_pool' as RiderDashboardView, route: '/rider' },
    { label: 'Active Jobs', icon: 'local_shipping', view: 'active_jobs' as RiderDashboardView, route: '/rider' },
    { label: 'Earnings', icon: 'payments', view: 'earnings' as RiderDashboardView, route: '/rider' },
    { label: 'Profile', icon: 'person', view: 'profile' as RiderDashboardView, route: '/rider' },
  ],
  admin: [
    { label: 'Control Tower', icon: 'settings_input_component', href: '/admin' },
    { label: 'User Mgt', icon: 'group', href: '/admin/users' },
    { label: 'Analytics', icon: 'analytics', href: '/admin/analytics' },
    { label: 'Ledger', icon: 'menu_book', href: '/admin/ledger' },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const customerCtx = useCustomerDashboardSafe();
  const customerActiveView = customerCtx?.activeView;
  const customerNavigateTo = customerCtx?.navigateTo;
  const riderCtx = useRiderDashboardSafe();
  const riderActiveView = riderCtx?.activeView;
  const riderNavigateTo = riderCtx?.navigateTo;

  const getLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full px-4 py-3 my-1 transition-all duration-300 border-l-[3px] cursor-pointer font-sans text-[11px] font-bold uppercase tracking-widest ${
      isActive
        ? 'bg-primary/10 border-l-primary text-primary rounded-r-xl'
        : 'border-l-transparent text-text-muted hover:text-primary hover:bg-primary/5 hover:rounded-r-xl hover:border-l-primary/30'
    }`;

  // Framer Motion variants for stagger
  const listVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <aside
      className="w-52 flex-shrink-0 h-screen fixed left-0 top-0 bg-[#ffffff] shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-border/50 flex flex-col z-40 pt-[64px]"
      style={{ contentVisibility: 'auto' }}
    >
      <nav className="flex-1 overflow-y-auto py-6 pr-4">
        {/* Customer Group */}
        <VisibilityWrapper roles={['customer']}>
          <div className="mb-6">
            <p className="px-5 pb-2 text-[10px] font-black uppercase tracking-[0.25em] text-text-dim font-mono">
              Customer Operations
            </p>
            <motion.ul 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-1"
            >
              {navItems.customer.map((item) => {
                const isActive = customerActiveView === item.view;
                return (
                  <motion.li key={item.view} variants={itemVariants}>
                    <button
                      className={getLinkClass(isActive)}
                      onClick={() => {
                        if (!pathname.startsWith(item.route)) {
                          router.push(item.route);
                        }
                        customerNavigateTo?.(item.view);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        </VisibilityWrapper>

        {/* Rider Group */}
        <VisibilityWrapper roles={['rider']}>
          <div className="mb-6">
            <p className="px-5 pb-2 text-[10px] font-black uppercase tracking-[0.25em] text-text-dim font-mono">
              Rider Terminal
            </p>
            <motion.ul 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-1"
            >
              {navItems.rider.map((item) => {
                const isActive = riderActiveView === item.view;
                return (
                  <motion.li key={item.view} variants={itemVariants}>
                    <button
                      className={getLinkClass(isActive)}
                      onClick={() => {
                        if (!pathname.startsWith(item.route)) {
                          router.push(item.route);
                        }
                        riderNavigateTo?.(item.view);
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        </VisibilityWrapper>

        {/* Admin Group */}
        <VisibilityWrapper roles={['admin']}>
          <div className="mb-6">
            <p className="px-5 pb-2 text-[10px] font-black uppercase tracking-[0.25em] text-text-dim font-mono">
              Control Center
            </p>
            <motion.ul 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-1"
            >
              {navItems.admin.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <motion.li key={item.href} variants={itemVariants}>
                    <a
                      className={getLinkClass(isActive)}
                      href={item.href}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        </VisibilityWrapper>
      </nav>

      {/* User Profile Quick Actions */}
      <div className="p-4 bg-surface-low border-t border-border mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary flex items-center justify-center text-primary-text font-black text-xs">
            NX
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black truncate text-text uppercase tracking-wider font-sans">
              Operator
            </p>
            <p className="text-[10px] text-text-dim truncate font-mono">ONLINE</p>
          </div>
          <button className="p-1 hover:bg-surface-dim transition-colors duration-[var(--duration-200)] cursor-pointer">
            <span className="material-symbols-outlined text-[18px] text-text-muted">more_vert</span>
          </button>
        </div>
      </div>
    </aside>
  );
}