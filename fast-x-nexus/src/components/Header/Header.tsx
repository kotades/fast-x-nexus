'use client';

/**
 * Header — Dynamic Realtime Logistics Status & Navigation
 *
 * Automatically reflects the live operational state of the logistics engine:
 * - 1 Pool Job Ready (when jobs are in queue)
 * - Heading to Pickup (FX-XXXX) (when a job is claimed/assigned)
 * - In Transit to Dropoff (FX-XXXX) (when cargo is picked up)
 * - Fleet Online — Standby (when idle)
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { getActiveRiderJobs } from '@/app/actions/rider';
import { useCustomerDashboardSafe } from '@/components/customer/contexts/CustomerDashboardContext';
import { useRiderDashboardSafe } from '@/components/rider/contexts/RiderDashboardContext';
import { Logo } from '@/components/ui/Logo';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{ id: string; status: string } | null>(null);
  const customerContext = useCustomerDashboardSafe();
  const riderContext = useRiderDashboardSafe();

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = profile?.role ?? null;
      setUserRole(role);

      // Fetch status based on current view/portal
      const isCustomerPortal = pathname?.startsWith('/customer') || customerContext !== null;
      const isRiderPortal = pathname?.startsWith('/rider') || riderContext !== null;

      if (isRiderPortal || role === 'rider' || role === 'admin') {
        const { data: unassigned } = await supabase
          .from('orders')
          .select('id')
          .eq('status', 'PAID_UNASSIGNED');
        setUnassignedCount(unassigned?.length || 0);

        const res = await getActiveRiderJobs();
        if (res.success && res.data && res.data.length > 0) {
          setActiveJob(res.data[0]);
        } else {
          setActiveJob(null);
        }
      }

      if (isCustomerPortal || role === 'customer') {
        const { data: customerActive } = await supabase
          .from('orders')
          .select('id, status, created_at')
          .eq('customer_id', user.id)
          .in('status', ['PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP'])
          .order('created_at', { ascending: false })
          .limit(1);
        setActiveJob(customerActive?.[0] || null);
      }
    };

    fetchStatus();

    // 4s polling fallback + Supabase realtime subscription
    const interval = setInterval(fetchStatus, 4000);

    const channel = supabase
      .channel('header-logistics-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, pathname, customerContext, riderContext]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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
    if (riderContext?.activeView) {
      const titles: Record<string, string> = {
        job_pool: 'JOB POOL',
        active_jobs: 'ACTIVE JOBS',
        route_map: 'DISPATCH MAP',
        earnings: 'EARNINGS LEDGER',
        profile: 'DRIVER PROFILE',
      };
      return titles[riderContext.activeView] || 'RIDER CONSOLE';
    }
    if (userRole === 'admin') return 'CONTROL TOWER';
    if (userRole === 'rider') return 'RIDER CONSOLE';
    return 'DASHBOARD';
  };

  const getStatusBadge = () => {
    const isCustomerPortal = pathname?.startsWith('/customer') || customerContext !== null;
    const isRiderPortal = pathname?.startsWith('/rider') || riderContext !== null;

    // CUSTOMER PORTAL BADGES
    if (isCustomerPortal) {
      if (activeJob) {
        if (activeJob.status === 'PAID_UNASSIGNED') {
          return {
            text: `MATCHING COURIER (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'MATCHING',
            dotColor: 'bg-amber-500',
            bgColor: 'bg-amber-500/15 border-amber-500/40 text-amber-800',
          };
        }
        if (activeJob.status === 'ASSIGNED') {
          return {
            text: `COURIER EN ROUTE (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'EN ROUTE',
            dotColor: 'bg-amber-500',
            bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
          };
        }
        if (activeJob.status === 'PICKED_UP' || activeJob.status === 'IN_TRANSIT') {
          return {
            text: `IN TRANSIT TO DROPOFF (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'IN TRANSIT',
            dotColor: 'bg-blue-500',
            bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-700',
          };
        }
      }
      // On customer side, NEVER show rider job pool or standby badges
      return null;
    }

    // RIDER & ADMIN PORTAL BADGES
    if (isRiderPortal || userRole === 'rider' || userRole === 'admin') {
      if (activeJob) {
        if (activeJob.status === 'ASSIGNED') {
          return {
            text: `EN ROUTE TO PICKUP (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'PICKUP',
            dotColor: 'bg-amber-500',
            bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
          };
        }
        if (activeJob.status === 'PICKED_UP' || activeJob.status === 'IN_TRANSIT') {
          return {
            text: `IN TRANSIT TO DROPOFF (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'IN TRANSIT',
            dotColor: 'bg-blue-500',
            bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-700',
          };
        }
      }

      if (unassignedCount > 0) {
        return {
          text: `${unassignedCount} POOL JOB${unassignedCount > 1 ? 'S' : ''} READY`,
          shortText: `${unassignedCount} READY`,
          dotColor: 'bg-amber-500',
          bgColor: 'bg-amber-500/15 border-amber-500/40 text-amber-800',
        };
      }

      return {
        text: 'FLEET ONLINE — STANDBY',
        shortText: 'ONLINE',
        dotColor: 'bg-emerald-500',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
      };
    }

    return null;
  };

  const displayTitle = getDisplayTitle();
  const statusBadge = getStatusBadge();

  return (
    <header
      className="bg-surface-elevated/90 backdrop-blur-xl sticky top-0 w-full h-16 shrink-0 flex justify-between items-center px-3 sm:px-4 md:px-6 z-30 border-b border-border/50 shadow-[0_2px_16px_rgba(0,0,0,0.02)] gap-2 sm:gap-4 max-w-full overflow-hidden"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Left: Mobile Menu Button & Brand + Breadcrumb Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button 
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-text hover:bg-surface-dim transition-colors cursor-pointer"
          onClick={onMenuToggle}
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <Logo width="w-24 sm:w-28 md:w-36" height="h-7 sm:h-8" />

        {displayTitle && (
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-border/60">
            <AnimatePresence mode="wait">
              <motion.span
                key={displayTitle}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-bold uppercase tracking-[0.15em] text-primary font-sans whitespace-nowrap"
              >
                {displayTitle}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right Side Actions & Dynamic Realtime Status */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink min-w-0 justify-end">
        {/* Dynamic Realtime Logistics Status Badge */}
        {statusBadge && (
          <AnimatePresence mode="wait">
            <motion.div
              key={statusBadge.text}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`border px-2 sm:px-2.5 md:px-3 py-1 flex items-center gap-1.5 sm:gap-2 select-none font-mono shrink-0 rounded ${statusBadge.bgColor}`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className={`absolute inline-flex h-full w-full rounded-full ${statusBadge.dotColor} opacity-75`}
                />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusBadge.dotColor}`} />
              </span>
              <span className="text-[9.5px] sm:text-[10px] uppercase font-black tracking-wider md:tracking-widest font-mono whitespace-nowrap">
                <span className="sm:hidden">{statusBadge.shortText || statusBadge.text}</span>
                <span className="hidden sm:inline">{statusBadge.text}</span>
              </span>
            </motion.div>
          </AnimatePresence>
        )}

        <a
          href="/about"
          className="hidden xl:inline-flex items-center min-h-[44px] text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-primary transition-colors duration-[var(--duration-200)] whitespace-nowrap font-sans"
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          Documentation
        </a>
        <button
          onClick={handleLogout}
          className="min-h-[38px] min-w-[38px] sm:min-h-[40px] px-2 sm:px-3 py-1 text-text-muted hover:text-error border border-border/80 hover:border-error/40 hover:bg-error-bg/60 transition-all duration-[var(--duration-200)] cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 font-sans rounded-md select-none group shadow-xs"
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-label="Sign Out of Session"
          title="Sign Out of Session"
        >
          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-0.5">
            logout
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
            Sign Out
          </span>
        </button>
      </div>
    </header>
  );
}