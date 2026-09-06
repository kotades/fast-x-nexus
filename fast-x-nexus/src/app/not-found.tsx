'use client';

/**
 * /src/app/not-found.tsx
 * Fast X Nexus — Custom 404 & Waybill Recovery Terminal
 *
 * Implements:
 * - Search bar with direct waybill tracking lookup & quick route search
 * - Clear telemetry status (HTTP 404 / FX-404: COORDINATE_UNINDEXED)
 * - Quick links with >= 44px touch targets
 * - Instant Courier Dispatch Within 15 Minutes Across Lagos promise
 * - Clickable tel:+2349014030047 & mailto:operations@fastx.ng
 * - Crisp industrial monochrome styling with solid brand accents (0 gradients)
 * - 0 emojis in headings, crisp Material Symbols Outlined icons
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (q.toUpperCase().startsWith('FX-') || q.length >= 6) {
      router.push(`/tracking?code=${encodeURIComponent(q.toUpperCase())}`);
    } else {
      router.push(`/tracking?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-error/10 border border-error/30 text-error text-xs font-mono font-bold uppercase tracking-widest mb-6">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
          <span>STATUS: 404 — CELL_NOT_INDEXED</span>
        </div>

        {/* Large Industrial Status Header */}
        <div className="text-center space-y-4 max-w-2xl mb-10">
          <h1 className="text-6xl sm:text-8xl font-black font-mono tracking-tighter text-[var(--color-text)] leading-none">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)] font-sans">
            Dispatch Waypoint Not Found
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-muted)] font-sans leading-relaxed">
            The requested spatial waypoint, tracking identifier, or resource does not exist on the
            Fast X Nexus H3 logistics grid. Verify your waybill code or return to active telemetry.
          </p>
        </div>

        {/* Interactive Search Bar */}
        <div className="w-full max-w-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-4 sm:p-6 shadow-sm mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="waybill-recovery-input" className="sr-only">
                Search Waybill Tracking Code or Operational Route
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-dim)]">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">search</span>
              </div>
              <input
                id="waybill-recovery-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ENTER WAYBILL CODE (e.g. FX-97DEF3)..."
                aria-label="Search Waybill Tracking Code"
                className="w-full min-h-[44px] bg-[var(--color-surface)] border border-[var(--color-border)] pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-mono font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Locate</span>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
            </button>
          </form>
          <p className="text-[11px] text-[var(--color-text-dim)] mt-2 font-mono">
            Direct tracking format: <span className="text-[var(--color-primary)] font-bold">FX-XXXXXX</span>
          </p>
        </div>

        {/* Quick Links Matrix (Touch targets >= 44px) */}
        <div className="w-full max-w-2xl mb-12">
          <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-[var(--color-text-dim)] mb-4 text-center">
            Active Grid Navigation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">home</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Operations Base
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Landing & Intel</p>
              </div>
            </Link>

            <Link
              href="/tracking"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">radar</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Waybill Radar
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Live Telemetry</p>
              </div>
            </Link>

            <Link
              href="/booking"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">local_shipping</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Book Dispatch
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Express Freight</p>
              </div>
            </Link>

            <Link
              href="/fleet"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">commute</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Courier Fleet
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Multimodal Grid</p>
              </div>
            </Link>

            <Link
              href="/customer"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">dashboard</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Customer Portal
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Command Map</p>
              </div>
            </Link>

            <Link
              href="/rider"
              className="min-h-[44px] p-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)] flex items-center gap-3 transition-colors group"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden="true">two_wheeler</span>
              <div>
                <p className="text-xs font-bold text-[var(--color-text)] font-sans group-hover:text-[var(--color-primary)]">
                  Rider Terminal
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] font-mono">Job Pool & Route</p>
              </div>
            </Link>
          </div>
        </div>

        {/* SLA Promise & Operations Contact Bar */}
        <div className="w-full max-w-2xl bg-[var(--color-surface-elevated)] border-l-4 border-l-[var(--color-accent)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] font-sans uppercase">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-lg" aria-hidden="true">speed</span>
              <span>Instant Courier Dispatch Within 15 Minutes Across Lagos</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] font-sans mt-0.5">
              Need urgent waypoint routing assistance? Contact operations dispatch directly:
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:+2349014030047"
              className="min-h-[44px] px-3.5 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-1.5 transition-colors"
              aria-label="Call Dispatch Hotline: +2349014030047"
            >
              <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">call</span>
              <span>+234 901 403 0047</span>
            </a>
            <a
              href="mailto:operations@fastx.ng"
              className="min-h-[44px] px-3.5 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-1.5 transition-colors"
              aria-label="Email Operations: operations@fastx.ng"
            >
              <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">mail</span>
              <span>operations@fastx.ng</span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
