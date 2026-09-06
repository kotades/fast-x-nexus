 'use client';

/**
 * Footer — Refactored: Large-Type Brand Footer (Kota Skillz #3)
 *
 * Design Logic:
 * - Kota Skillz "Large-Type Footer" — oversized logotype fills the space
 * - Brand Identity — Forest Green primary, Gold accent, sharp 0px corners
 * - Enterprise SaaS — "trustworthy yet vibrant" with colored shadows
 * - Animation — Framer Motion useInView for scroll-triggered entrance
 *
 * Two tiers:
 *   Public: Large-Type hero with oversized "FAST X NEXUS" logotype
 *   Dashboard: Swiss grid with system status
 */

import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          PUBLIC FOOTER — Always rendered for all visitors
          ═══════════════════════════════════════════════════ */}
      <footer
        ref={footerRef}
        className="relative w-full bg-[var(--color-surface-elevated)] border-t-2 border-[var(--color-primary)] overflow-hidden"
      >
        {/* Giant Brand Logotype & SLA Promise */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ type: 'spring' as const, damping: 20, stiffness: 100, mass: 1.2 }}
          className="relative z-10 flex flex-col items-center justify-center pt-12 md:pt-16 px-6 text-center"
        >
          <h2
            className="font-mono text-[10vw] sm:text-[8vw] md:text-[6vw] font-black uppercase tracking-tighter text-[var(--color-primary)] leading-none select-none max-w-full truncate"
            style={{ letterSpacing: '-0.04em' }}
          >
            FAST X NEXUS
          </h2>
          <p className="text-[var(--color-primary)] text-xs font-mono font-bold uppercase tracking-widest mt-3">
            Instant Courier Dispatch Within 15 Minutes Across Lagos
          </p>
          <p className="text-[var(--color-text-dim)] text-[11px] font-sans uppercase tracking-[0.25em] mt-1 mb-2">
            H3 Spatial Logistics & Autonomous Micro-Routing Engine
          </p>
        </motion.div>

        {/* Navigation & Contact Matrix */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 pt-10 pb-8 border-t border-[var(--color-border)]"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Logistics Solutions */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
                Logistics Solutions
              </h3>
              <ul className="space-y-1">
                {[
                  { label: 'Waybill Tracking', href: '/tracking' },
                  { label: 'Book Dispatch', href: '/booking' },
                  { label: 'Fleet Grid', href: '/fleet' },
                  { label: 'H3 Network Matrix', href: '/network' },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="min-h-[44px] inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-200 font-sans"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Platform & Intel */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
                Platform & Intel
              </h3>
              <ul className="space-y-1">
                {[
                  { label: 'Company Overview', href: '/about' },
                  { label: 'Lagos Logistics FAQ', href: '/#faq' },
                  { label: 'Contact Operations', href: '/contact' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Admin Access (Operations)', href: '/login/admin' },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="min-h-[44px] inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-200 font-sans"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Couriers & Fleets */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
                Drivers & Fleets
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="/onboarding/rider"
                    className="min-h-[44px] inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline transition-colors duration-200 font-sans"
                  >
                    <span>Become a Rider</span>
                    <span className="material-symbols-outlined text-xs" aria-hidden="true">arrow_outward</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/rider"
                    className="min-h-[44px] inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-200 font-sans"
                  >
                    Rider Terminal
                  </a>
                </li>
                <li>
                  <a
                    href="/customer"
                    className="min-h-[44px] inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-200 font-sans"
                  >
                    Customer Portal
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="min-h-[44px] inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-200 font-sans"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Lagos Dispatch Hotline */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
                Operations Hotline
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="tel:+2349014030047"
                    className="min-h-[44px] inline-flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors duration-200"
                    aria-label="Call Dispatch Hotline: +2349014030047"
                  >
                    <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">call</span>
                    <span>+234 901 403 0047</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:operations@fastx.ng"
                    className="min-h-[44px] inline-flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors duration-200"
                    aria-label="Email Operations: operations@fastx.ng"
                  >
                    <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">mail</span>
                    <span>operations@fastx.ng</span>
                  </a>
                </li>
                <li className="pt-1 text-[11px] text-[var(--color-text-muted)] font-sans">
                  14 Alexander Avenue, Ikoyi, Lagos State, Nigeria
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[var(--color-border)] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Logo showSubtitle={false} className="opacity-70" iconSize={28} />
              <span className="text-[11px] text-[var(--color-text-muted)] font-sans">© 2026 Fast X Nexus Limited. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href="/login/admin"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[var(--color-primary)] hover:underline"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">admin_panel_settings</span>
                <span>Admin Login</span>
              </a>
              <span className="text-[var(--color-border)] hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
                  Lagos Dispatch Systems Operational (24/7)
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </footer>

      {/* ═══════════════════════════════════════════════════
          DASHBOARD FOOTER — Swiss Grid with Status
          ═══════════════════════════════════════════════════ */}
      <VisibilityWrapper roles={['customer', 'rider', 'vendor', 'admin']}>
        <footer
          className="w-full bg-surface-low border-t border-border px-6 py-3.5 z-45 relative"
          style={{ contentVisibility: 'auto' }}
        >
          <div className="flex justify-between items-center font-sans text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-5 text-text-muted">
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-1.5 h-1.5 bg-success"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="font-black">Systems Operational</span>
              </div>
              <span className="text-text-dim border-l border-border pl-4">Ver 1.2.0</span>
            </div>
          </div>
        </footer>
      </VisibilityWrapper>
    </>
  );
}