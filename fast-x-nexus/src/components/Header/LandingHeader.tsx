'use client';

/**
 * LandingHeader — Public-facing navigation for the landing page.
 * Logo height fills the header, width covers 17% of header.
 * Nav links are absolutely centered in the header.
 * Route links to /about, /booking, /contact.
 */

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function LandingHeader() {
  return (
    <header className="bg-[var(--color-surface-elevated)] sticky top-0 w-full h-[72px] z-50 border-b border-[var(--color-border)]">
      <div className="relative flex items-center h-full px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {/* Brand — Left-aligned, height fills header, width covers 17% */}
        <Link href="/" className="relative h-full py-2 flex items-center shrink-0" style={{ width: '17%', minWidth: '180px', maxWidth: '280px' }}>
          <Logo width="w-full" height="h-full" />
        </Link>

        {/* Desktop Navigation — Absolutely centered in the header */}
        <nav className="hidden md:flex items-center gap-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[
            { label: 'About', href: '/about' },
            { label: 'Booking', href: '/booking' },
            { label: 'Contact', href: '/contact' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-200 relative group py-2 whitespace-nowrap"
            >
              <span>{item.label}</span>
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--color-primary)] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
            </Link>
          ))}
        </nav>

        {/* Sign In — Right-aligned */}
        <div className="ml-auto flex items-center shrink-0">
          <Link
            href="/login"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}