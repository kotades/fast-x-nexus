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

import React, { useEffect, useState, useRef } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerDashboardSafe, type DashboardView } from '@/components/customer/contexts/CustomerDashboardContext';
import { useRiderDashboardSafe, type RiderDashboardView } from '@/components/rider/contexts/RiderDashboardContext';
import { Logo } from '@/components/ui/Logo';
import { createBrowserClient } from '@/lib/supabase/client';

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
    { label: 'Dispatch Map', icon: 'map', view: 'route_map' as RiderDashboardView, route: '/rider' },
    { label: 'Earnings', icon: 'payments', view: 'earnings' as RiderDashboardView, route: '/rider' },
    { label: 'Profile', icon: 'person', view: 'profile' as RiderDashboardView, route: '/rider' },
  ],
  admin: [
    { label: 'Spatial Radar', icon: 'radar', tab: 'radar', href: '/admin?tab=radar' },
    { label: 'Waybill Board', icon: 'view_kanban', tab: 'waybills', href: '/admin?tab=waybills' },
    { label: 'Rider Fleet Ops', icon: 'two_wheeler', tab: 'riders', href: '/admin?tab=riders' },
    { label: 'Escrow & Ledger', icon: 'account_balance_wallet', tab: 'ledger', href: '/admin?tab=ledger' },
    { label: 'System Health', icon: 'dns', tab: 'telemetry', href: '/admin?tab=telemetry' },
    { label: 'Omnichannel Comms', icon: 'forum', tab: 'chat', href: '/admin?tab=chat' },
  ],
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface SidebarUserData {
  fullName: string;
  email: string;
  role: string;
  initials: string;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const customerCtx = useCustomerDashboardSafe();
  const customerActiveView = customerCtx?.activeView;
  const customerNavigateTo = customerCtx?.navigateTo;
  const riderCtx = useRiderDashboardSafe();
  const riderActiveView = riderCtx?.activeView;
  const riderNavigateTo = riderCtx?.navigateTo;

  const [userData, setUserData] = useState<SidebarUserData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<string>('radar');
  const menuRef = useRef<HTMLDivElement>(null);

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
    window.addEventListener('fastx:admin:set_tab', handleSetTab);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('fastx:admin:set_tab', handleSetTab);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient();
    let isMounted = true;

    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, metadata')
          .eq('id', user.id)
          .single();

        const role = (profile?.role as string) || (user.user_metadata?.role as string) || 'customer';
        const meta = (profile?.metadata as any) || {};
        const email = user.email || '';

        // If a customer hasn't explicitly set their full_name in the profile page,
        // use the designated placeholder "Fast X Customer" with "FX" initials.
        let fullName = '';
        let initials = 'FX';

        if (meta.full_name && typeof meta.full_name === 'string' && meta.full_name.trim().length > 0) {
          fullName = meta.full_name.trim();
          const nameParts = fullName.split(/\s+/);
          if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
          } else if (nameParts[0]?.length >= 2) {
            initials = nameParts[0].slice(0, 2).toUpperCase();
          }
        } else if (role === 'customer') {
          fullName = 'Fast X Customer';
          initials = 'FX';
        } else {
          fullName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Operator');
          const nameParts = fullName.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
          } else {
            initials = fullName.slice(0, 2).toUpperCase();
          }
        }

        if (isMounted) {
          setUserData({
            fullName,
            email,
            role,
            initials,
          });
        }
      } catch (e) {
        console.warn('[Sidebar] Error fetching user profile:', e);
      }
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    const handleProfileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.fullName !== undefined) {
        const newName = (customEvent.detail.fullName || '').trim();
        if (newName) {
          const parts = newName.split(/\s+/);
          const newInitials = parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : newName.slice(0, 2).toUpperCase();
          setUserData((prev) => prev ? { ...prev, fullName: newName, initials: newInitials } : null);
        } else {
          setUserData((prev) => prev ? { ...prev, fullName: 'Fast X Customer', initials: 'FX' } : null);
        }
      } else {
        fetchUser();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('fastx:profile_updated', handleProfileUpdated);
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('fastx:profile_updated', handleProfileUpdated);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleNavigateToProfile = () => {
    setIsMenuOpen(false);
    onClose?.();
    if (pathname.startsWith('/customer')) {
      customerNavigateTo?.('profile');
    } else if (pathname.startsWith('/rider')) {
      riderNavigateTo?.('profile');
    } else {
      router.push('/customer');
      customerNavigateTo?.('profile');
    }
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 w-full min-h-[44px] px-4 py-2.5 my-1 transition-all duration-300 border-l-[3px] cursor-pointer font-sans text-[11px] font-bold uppercase tracking-widest ${
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
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 z-30 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside
        className={`w-52 flex-shrink-0 h-screen fixed left-0 top-0 bg-surface-elevated shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-border/50 flex flex-col z-40 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ contentVisibility: 'auto' }}
      >
        {/* Top Logo / Brand Container with Mobile Dismiss */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-5 border-b border-border/50">
          <Logo width="w-28 sm:w-32" height="h-7" />
          <button
            onClick={onClose}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-dim transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 pr-4">
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
                const isActive = pathname.startsWith('/customer') && customerActiveView === item.view;
                return (
                  <motion.li key={item.view} variants={itemVariants}>
                    <button
                      className={getLinkClass(isActive)}
                      onClick={() => {
                        if (!pathname.startsWith(item.route)) {
                          router.push(item.route);
                        }
                        customerNavigateTo?.(item.view);
                        onClose?.();
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
                const isActive = pathname.startsWith('/rider') && riderActiveView === item.view;
                return (
                  <motion.li key={item.view} variants={itemVariants}>
                    <button
                      className={getLinkClass(isActive)}
                      onClick={() => {
                        if (!pathname.startsWith(item.route)) {
                          router.push(item.route);
                        }
                        riderNavigateTo?.(item.view);
                        onClose?.();
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
                const isActive = pathname === '/admin' && adminActiveTab === item.tab;
                return (
                  <motion.li key={item.href} variants={itemVariants}>
                    <button
                      className={getLinkClass(isActive)}
                      onClick={(e) => {
                        e.preventDefault();
                        if (typeof window !== 'undefined') {
                          setAdminActiveTab(item.tab);
                          if (pathname === '/admin') {
                            window.dispatchEvent(
                              new CustomEvent('fastx:admin:set_tab', { detail: { tab: item.tab } })
                            );
                            window.history.pushState(null, '', item.href);
                          } else {
                            router.push(item.href);
                          }
                        }
                        onClose?.();
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
      </nav>

      {/* User Profile Quick Actions & Dynamic Menu */}
      <div className="relative p-3 bg-surface-low border-t border-border mt-auto" ref={menuRef}>
        {/* Floating Light-Theme Popover Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-2 right-2 mb-2 bg-[#ffffff] border border-border rounded-xl shadow-2xl p-2 z-50 font-sans"
            >
              {/* User Identity Header */}
              <div className="px-2.5 py-2 border-b border-border/70 mb-1">
                <p className="text-xs font-bold text-text truncate">
                  {userData?.fullName || 'Active User'}
                </p>
                <p className="text-[11px] text-text-muted truncate font-mono mt-0.5">
                  {userData?.email || 'authenticated'}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded">
                  {userData?.role || 'customer'}
                </span>
              </div>

              {/* Menu Actions */}
              <div className="space-y-0.5">
                <button
                  onClick={handleNavigateToProfile}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-text hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-base text-primary">person</span>
                  <span>View Profile</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-base text-red-500">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Card */}
        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-dim transition-colors cursor-pointer select-none"
        >
          <div className="w-9 h-9 bg-primary flex items-center justify-center text-primary-text font-black text-xs rounded shrink-0 shadow-sm">
            {userData?.initials || 'FX'}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-xs font-black truncate text-text uppercase tracking-wider font-sans">
              {userData?.fullName || 'Operator'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-text-dim truncate font-mono uppercase font-bold tracking-wider">
                {userData?.role || 'Online'}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-dim transition-colors cursor-pointer text-text-muted hover:text-text shrink-0"
            aria-label="User account menu"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}