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
import { ThreeDimensionalFLogo } from '@/components/ui/ThreeDimensionalFLogo';
import Image from 'next/image';

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
            bgColor: 'bg-amber-50/90 border-amber-300 text-amber-900',
          };
        }
        if (activeJob.status === 'ASSIGNED') {
          return {
            text: `COURIER EN ROUTE (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'EN ROUTE',
            dotColor: 'bg-amber-500',
            bgColor: 'bg-amber-50/90 border-amber-300 text-amber-900',
          };
        }
        if (activeJob.status === 'PICKED_UP' || activeJob.status === 'IN_TRANSIT') {
          return {
            text: `IN TRANSIT TO DROPOFF (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'IN TRANSIT',
            dotColor: 'bg-blue-500',
            bgColor: 'bg-blue-50/90 border-blue-300 text-blue-900',
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
            bgColor: 'bg-amber-50/90 border-amber-300 text-amber-900',
          };
        }
        if (activeJob.status === 'PICKED_UP' || activeJob.status === 'IN_TRANSIT') {
          return {
            text: `IN TRANSIT TO DROPOFF (FX-${activeJob.id.substring(0, 6).toUpperCase()})`,
            shortText: 'IN TRANSIT',
            dotColor: 'bg-blue-500',
            bgColor: 'bg-blue-50/90 border-blue-300 text-blue-900',
          };
        }
      }

      if (unassignedCount > 0) {
        return {
          text: `${unassignedCount} POOL JOB${unassignedCount > 1 ? 'S' : ''} READY`,
          shortText: `${unassignedCount} READY`,
          dotColor: 'bg-amber-500',
          bgColor: 'bg-amber-50/90 border-amber-300 text-amber-900',
        };
      }

      return {
        text: 'FLEET ONLINE — STANDBY',
        shortText: 'ONLINE',
        dotColor: 'bg-emerald-500',
        bgColor: 'bg-emerald-50/90 border-emerald-300 text-emerald-900',
      };
    }

    return null;
  };

  const displayTitle = getDisplayTitle();
  const statusBadge = getStatusBadge();

  return (
    <header
      className="absolute top-0 left-0 right-0 w-full shrink-0 z-30 px-2.5 pt-2.5 sm:px-4 sm:pt-3 pointer-events-none"
    >
      <div className="max-w-6xl mx-auto h-11 sm:h-12 rounded-full bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.05)] px-2.5 sm:px-4 flex items-center justify-between pointer-events-auto transition-all">
        {/* Left: 3D Animated F Logo / Menu Toggle & Brand Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {/* 3D Interactive Volumetric F Emblem (Animated Menu Trigger) */}
          <ThreeDimensionalFLogo onClick={onMenuToggle} size={32} />

          {/* Brand & Breadcrumb Title (Image 4 Inspiration: BRAND • SECTION) */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {/* Mobile: Just "FAST X" */}
            <span className="sm:hidden font-black text-xs tracking-wider text-slate-950 font-sans whitespace-nowrap">
              FAST X
            </span>
            {/* Desktop: Full Wordmark */}
            <span className="hidden sm:inline font-black text-sm tracking-wider text-slate-950 font-sans whitespace-nowrap">
              FAST X <span className="text-emerald-700 font-black">NEXUS</span>
            </span>

            {displayTitle && (
              <>
                <span className="text-slate-300 text-xs font-bold select-none shrink-0">•</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={displayTitle}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 4 }}
                    transition={{ duration: 0.15 }}
                    className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-[0.14em] text-emerald-800 font-mono truncate"
                  >
                    {displayTitle}
                  </motion.span>
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Realtime Status Badge & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Dynamic Realtime Logistics Status Badge */}
          {statusBadge && (
            <AnimatePresence mode="wait">
              <motion.div
                key={statusBadge.text}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`border px-2 sm:px-2.5 py-0.5 sm:py-1 flex items-center gap-1.5 select-none font-mono shrink-0 rounded-full shadow-2xs ${statusBadge.bgColor}`}
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className={`absolute inline-flex h-full w-full rounded-full ${statusBadge.dotColor} opacity-75`}
                  />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusBadge.dotColor}`} />
                </span>
                <span className="text-[9px] sm:text-[9.5px] uppercase font-black tracking-wider font-mono whitespace-nowrap">
                  <span className="sm:hidden">{statusBadge.shortText || statusBadge.text}</span>
                  <span className="hidden sm:inline">{statusBadge.text}</span>
                </span>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Sleek Rounded Sign Out Action */}
          <button
            onClick={handleLogout}
            className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200/90 flex items-center justify-center transition-colors cursor-pointer shadow-xs select-none group focus:outline-none"
            aria-label="Sign Out of Session"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[15px] sm:text-base transition-transform duration-200 group-hover:translate-x-0.5">
              logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}