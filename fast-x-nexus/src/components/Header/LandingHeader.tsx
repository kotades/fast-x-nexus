'use client';

/**
 * LandingHeader — Public-facing navigation for the landing page.
 * Logo height fills the header, width covers 17% of header.
 * Nav links are absolutely centered in the header.
 * Route links to /about, /booking, /contact.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <header className="bg-[var(--color-surface-elevated)] sticky top-0 w-full h-[72px] z-50 border-b border-[var(--color-border)] max-w-full overflow-x-hidden">
      <div className="relative flex items-center h-full px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {/* Brand — Left-aligned */}
        <Link href="/" className="relative h-full py-2 flex items-center shrink-0 w-32 sm:w-40 md:w-48 max-w-[280px]">
          <Logo width="w-full" height="h-full" />
        </Link>

        {/* Desktop Navigation — Absolutely centered in the header */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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
            className="md:hidden flex items-center justify-center p-2 text-[var(--color-text)] cursor-pointer min-w-[44px] min-h-[44px]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden absolute top-[72px] left-0 w-full bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] overflow-hidden flex flex-col shadow-xl"
          >
            <div className="flex flex-col p-2">
              {[
                { label: 'About', href: '/about' },
                { label: 'Booking', href: '/booking' },
                { label: 'Drive & Earn', href: '/onboarding/rider' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-dim)] px-6 py-4 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}