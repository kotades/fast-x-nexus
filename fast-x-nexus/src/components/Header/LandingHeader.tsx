'use client';

/**
 * /src/components/Header/LandingHeader.tsx
 * Fast X Nexus — Global Floating Glassmorphic Island Header
 *
 * Implements the global floating island design language:
 * - Floating curved glass pill with luminous frosted backdrop (bg-white/85 backdrop-blur-2xl)
 * - 3D Interactive Volumetric "F" Emblem as mobile drawer trigger & brand anchor
 * - High-contrast industrial typography with zero dark-on-dark muddying
 * - Centered desktop navigation pills with responsive viewport adaptation
 * - Dynamic auth status pill (Dashboard if logged in, Sign In if guest)
 * - Glassmorphic mobile drawer with navigation grid & emergency dispatch hotline
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import { ThreeDimensionalFLogo } from '@/components/ui/ThreeDimensionalFLogo';

export function LandingHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role ?? 'customer');
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    checkAuth();
  }, [supabase]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: 'About', href: '/about', icon: 'corporate_fare' },
    { label: 'Booking', href: '/booking', icon: 'local_shipping' },
    { label: 'Drive & Earn', href: '/onboarding/rider', icon: 'two_wheeler' },
    { label: 'Contact', href: '/contact', icon: 'support_agent' },
  ];

  const getDashboardHref = () => {
    if (userRole === 'admin') return '/admin';
    if (userRole === 'rider') return '/rider';
    return '/customer';
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-50 px-2.5 pt-2.5 sm:px-4 sm:pt-3 pointer-events-none">
        <div className="max-w-6xl mx-auto h-11 sm:h-12 rounded-full bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.05)] px-2.5 sm:px-4 flex items-center justify-between pointer-events-auto transition-all">
          
          {/* Left: 3D Volumetric F Emblem & Brand Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <ThreeDimensionalFLogo
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              size={32}
              isOpen={isMobileMenuOpen}
            />

            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1 sm:gap-1.5 min-w-0 group"
              title="Fast X Nexus Home"
            >
              <span className="sm:hidden font-black text-xs tracking-wider text-slate-950 font-sans whitespace-nowrap">
                FAST X
              </span>
              <span className="hidden sm:inline font-black text-sm tracking-wider text-slate-950 font-sans whitespace-nowrap group-hover:text-emerald-800 transition-colors">
                FAST X <span className="text-emerald-700 font-black">NEXUS</span>
              </span>
            </Link>
          </div>

          {/* Center: Desktop Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1.5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/90'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Dynamic Auth Pill & Mobile Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAuthenticated ? (
              <Link
                href={getDashboardHref()}
                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[13px] sm:text-[15px]">dashboard</span>
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-xs flex items-center gap-1 whitespace-nowrap"
              >
                <span>Sign In</span>
                <span className="material-symbols-outlined text-[13px] sm:text-[15px]">arrow_forward</span>
              </Link>
            )}

            {/* Mobile Hamburger / Close Toggle Button (Screen < md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-7.5 h-7.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/90"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Frosted Glass Island Dropdown) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-40 pointer-events-auto"
              aria-hidden="true"
            />

            {/* Floating Glassmorphic Menu Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-14 sm:top-16 inset-x-2.5 sm:inset-x-4 max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] z-50 overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* Drawer Brand Header (No duplicate cancel button — top pill button serves as close) */}
              <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-emerald-800">
                    Logistics Navigation
                  </p>
                </div>
              </div>

              {/* Nav Links Grid (Clean 2x2 for the 4 core sections) */}
              <div className="p-3 grid grid-cols-2 gap-2">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all min-h-[46px] ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-800 hover:text-emerald-800 hover:bg-slate-100/90 active:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${
                          isActive ? 'text-white' : 'text-emerald-700'
                        }`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Quick Actions Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200/70">
                {/* Direct Dispatch Hotline Pill */}
                <a
                  href="tel:+2349014030047"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-bold uppercase tracking-wider rounded-xl min-h-[44px] hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-700" aria-hidden="true">call</span>
                  <span>Call Dispatch: +234 901 403 0047</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}