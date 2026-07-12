'use client';

/**
 * Header — Refactored with Framer Motion + Design Tokens
 *
 * Global navigation header with Supabase realtime pool count,
 * spring-bezier animated underlines, and semantic design tokens.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useCustomerDashboardSafe } from '@/components/customer/contexts/CustomerDashboardContext';
import { Logo } from '@/components/ui/Logo';
import { AnimatePresence } from 'framer-motion';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const customerContext = useCustomerDashboardSafe();

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role ?? null);
      }
    }
    fetchUserRole();
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'PAID_UNASSIGNED');
      if (!error && data) {
        setUnassignedCount(data.length);
      }
    };

    fetchCount();

    const channel = supabase
      .channel('header-waybill-pool')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinkClass = (isActive: boolean) =>
    `relative text-xs font-black uppercase tracking-widest h-full flex items-center px-1 transition-all duration-[var(--duration-200)] group ${
      isActive ? 'text-primary' : 'text-text-muted hover:text-primary'
    }`;

  const underlineClass = (isActive: boolean) =>
    `absolute bottom-0 left-0 w-full h-[3px] bg-primary transform origin-left transition-transform duration-[var(--duration-200)] ${
      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
    }`;

  const getDisplayTitle = () => {
    if (customerContext?.activeView) {
      const titles: Record<string, string> = {
        command_map: 'COMMAND MAP',
        booking_wizard: 'BOOKING ENGINE',
        activity_ledger: 'ACTIVITY LEDGER',
        profile: 'PROFILE',
      };
      return titles[customerContext.activeView] || 'DASHBOARD';
    }
    if (userRole === 'admin') return 'CONTROL TOWER';
    if (userRole === 'rider') return 'RIDER CONSOLE';
    return 'DASHBOARD';
  };

  const displayTitle = getDisplayTitle();

  return (
    <VisibilityWrapper roles={['customer', 'rider', 'vendor', 'admin']}>
      <header
        className="bg-[#ffffff]/80 backdrop-blur-xl fixed top-0 left-0 w-full h-[64px] flex justify-between items-center px-6 z-50 border-b border-border/50 shadow-[0_4px_32px_rgba(0,0,0,0.02)]"
        style={{ contentVisibility: 'auto' }}
      >
        {/* Brand — Left-aligned */}
        <div className="flex items-center w-48 shrink-0">
          <Logo width="w-32 md:w-40" height="h-8" />
        </div>

        {/* Center Title — Animated */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-sm font-black uppercase tracking-[0.25em] text-primary"
            >
              {displayTitle}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 h-full">

          {userRole === 'rider' && (
            <a className={navLinkClass(pathname === '/jobs')} href="/jobs">
              <span className="flex items-center gap-1.5">
                Rider Pool
                {unassignedCount > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                )}
              </span>
              <span
                className={underlineClass(pathname === '/jobs')}
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </a>
          )}

          {userRole === 'admin' && (
            <a className={navLinkClass(pathname === '/admin')} href="/admin">
              <span>Control Tower</span>
              <span
                className={underlineClass(pathname === '/admin')}
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </a>
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-5">
          {/* Active Job Pool Indicator */}
          {(userRole === 'rider' || userRole === 'admin') && unassignedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-accent/8 border border-accent/30 px-3 py-1 flex items-center gap-2 select-none"
            >
              <span className="relative flex h-2 w-2">
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"
                />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-[10px] uppercase font-black text-accent-dark tracking-widest font-mono">
                {unassignedCount} Pool Job{unassignedCount > 1 ? 's' : ''} Ready
              </span>
            </motion.div>
          )}

          <a
            href="#"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors duration-[var(--duration-200)]"
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            Support
          </a>
          <a
            href="#"
            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors duration-[var(--duration-200)]"
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            Documentation
          </a>
          <button
            onClick={handleLogout}
            className="text-[10px] font-black uppercase tracking-widest text-error border border-error/30 hover:bg-error-bg px-4 py-2 transition-all duration-[var(--duration-200)] cursor-pointer"
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
    </VisibilityWrapper>
  );
}