'use client';

/**
 * LandingHeader — Public-facing navigation for the landing page.
 * Logo height fills the header, width covers 17% of header.
 * Nav links are absolutely centered in the header.
 * Route links to /about, /booking, /contact.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { label: 'Tracking', href: '/tracking', icon: 'radar' },
    { label: 'Fleet Specs', href: '/fleet', icon: 'grid_view' },
    { label: 'Network Grid', href: '/network', icon: 'hub' },
    { label: 'Solutions', href: '/solutions', icon: 'dataset' },
    { label: 'Drive & Earn', href: '/onboarding/rider', icon: 'two_wheeler' },
    { label: 'Contact', href: '/contact', icon: 'support_agent' },
  ];

  return (
    <header className="bg-[var(--color-surface-elevated)] sticky top-0 w-full h-[72px] z-50 border-b border-[var(--color-border)]">
      <div className="relative flex items-center h-full px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {/* Brand — Left-aligned */}
        <Link 
          href="/" 
          onClick={() => setIsMobileMenuOpen(false)}
          className="relative h-full py-2 flex items-center shrink-0 w-32 sm:w-40 md:w-48 max-w-[280px]"
        >
          <Logo width="w-full" height="h-full" />
        </Link>

        {/* Desktop Navigation — Absolutely centered in the header */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[
            { label: 'About', href: '/about' },
            { label: 'Booking', href: '/booking' },
            { label: 'Drive & Earn', href: '/onboarding/rider' },
            { label: 'Contact', href: '/contact' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-200 relative group py-2 whitespace-nowrap min-h-[44px] inline-flex items-center"
            >
              <span>{item.label}</span>
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--color-primary)] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
            </Link>
          ))}
        </nav>

        {/* Sign In & Mobile Menu Toggle */}
        <div className="ml-auto flex items-center shrink-0 gap-2 sm:gap-3">
          <Link
            href="/login"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 sm:px-5 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 min-h-[44px] flex items-center justify-center whitespace-nowrap"
          >
            Sign In
          </Link>
          <button 
            type="button"
            className="md:hidden flex items-center justify-center p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] cursor-pointer min-w-[44px] min-h-[44px]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Fixed Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-[72px] bg-black/40 backdrop-blur-sm z-40"
              aria-hidden="true"
            />

            {/* Slide-down Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed inset-x-0 top-[72px] max-h-[calc(100vh-72px)] bg-white border-b-2 border-[var(--color-primary)] shadow-2xl z-50 overflow-y-auto flex flex-col justify-between"
            >
              {/* Nav Links Grid */}
              <div className="p-4 divide-y divide-gray-100">
                <div className="pb-2">
                  <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] px-3 mb-1">
                    Logistics Navigation
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-2">
                  {navLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-sm font-bold uppercase tracking-wider text-[#0F172A] hover:text-[var(--color-primary)] hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors rounded-none min-h-[48px]"
                    >
                      <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Drawer Quick-Action Footer */}
              <div className="p-4 bg-[#F8FAFC] border-t border-[var(--color-border)] space-y-3">
                {/* Direct Dispatch Hotline Pill */}
                <a
                  href="tel:+2349014030047"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-50 border border-emerald-200 text-[#006B3F] font-mono text-xs font-bold uppercase tracking-wider min-h-[48px] hover:bg-emerald-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-emerald-600" aria-hidden="true">call</span>
                  <span>Call Dispatch: +234 901 403 0047</span>
                </a>

                {/* Sign In & Admin Access buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 px-3 bg-[var(--color-primary)] text-white text-xs font-mono font-bold uppercase tracking-wider min-h-[44px] hover:bg-[var(--color-primary-hover)] transition-colors text-center"
                  >
                    Client Sign In
                  </Link>
                  <Link
                    href="/login/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2.5 px-3 bg-white border border-[#CBD5E1] text-[#0F172A] text-xs font-mono font-bold uppercase tracking-wider min-h-[44px] hover:bg-[#F1F5F9] transition-colors text-center"
                  >
                    Admin Portal
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}