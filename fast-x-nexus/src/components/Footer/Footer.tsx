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
        {/* Giant Brand Logotype */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring' as const, damping: 20, stiffness: 100, mass: 1.2 }}
          className="relative z-10 flex flex-col items-center justify-center pt-16 md:pt-20 px-6"
        >
          <h2
            className="font-mono text-[12vw] sm:text-[10vw] md:text-[8vw] lg:text-[7vw] font-black uppercase tracking-tighter text-[var(--color-primary)] leading-none select-none"
            style={{ letterSpacing: '-0.04em' }}
          >
            FAST X NEXUS
          </h2>
          <p className="text-[var(--color-text-muted)] text-xs font-sans uppercase tracking-[0.3em] mt-4 mb-2">
            Logistics Engine
          </p>
        </motion.div>

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 pt-12 pb-8 border-t border-[var(--color-border)]"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Product */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-4">
                Product
              </h3>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'API', 'Integrations'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[var(--duration-200)] font-sans"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Company */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-4">
                Company
              </h3>
              <ul className="space-y-2.5">
                {['About', 'Careers', 'Blog', 'Press'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[var(--duration-200)] font-sans"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-4">
                Resources
              </h3>
              <ul className="space-y-2.5">
                {['Documentation', 'Help Center', 'Partners', 'Terms'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[var(--duration-200)] font-sans"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Connect */}
            <div>
              <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-4">
                Connect
              </h3>
              <ul className="space-y-2.5">
                {['LinkedIn', 'X (Twitter)', 'GitHub', 'Instagram'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[var(--duration-200)] font-sans"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[var(--color-border)] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Logo showSubtitle={false} className="opacity-60" iconSize={28} />
              <span className="text-[10px] text-[var(--color-text-muted)] font-sans">© 2026 Fast X Nexus</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
                Systems Operational
              </span>
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