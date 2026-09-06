'use client';

/**
 * TrackingSection — Landing page section with simulated waybill query
 * and Remotion-inspired Route Path Pulsar SVG animation.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';

const TRACKING_DB: Record<string, {
  status: string;
  weight: string;
  origin: string;
  destination: string;
  eta: string;
  checkpoints: { time: string; location: string; event: string }[];
}> = {
  'FX-NEXUS-77': {
    status: 'TRANSIT',
    weight: '8.5kg',
    origin: 'Lagos Hub (H3: 871f1d4a0ffffff)',
    destination: 'Abuja Terminal (H3: 871f1d120ffffff)',
    eta: '2 hrs 40 mins',
    checkpoints: [
      { time: '09:00 AM', location: 'Lagos Cargo Terminal', event: 'Waybill scanned and loaded.' },
      { time: '10:30 AM', location: 'Shagamu Checkpoint', event: 'Transit lock active. Speed stable at 75km/h.' },
    ]
  }
};

export function TrackingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<typeof TRACKING_DB[string] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const key = query.trim().toUpperCase();
    setResult(TRACKING_DB[key] || null);
  };

  return (
    <section ref={ref} id="tracking-section" className="py-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Info Block (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Modular Modules / Tracing
            </p>
            <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-[var(--color-text)]">
              Waybill Telemetry
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Verify transit integrity with real-time coordinate updates mapped directly onto resolution 7 H3 cell nodes.
            </p>

            <form onSubmit={handleSearch} className="space-y-3 pt-2">
              <div className="relative">
                <label htmlFor="landing-tracking-input" className="sr-only">
                  Waybill Tracking Code
                </label>
                <input
                  id="landing-tracking-input"
                  type="text"
                  placeholder="ENTER WAYBILL CODE (e.g. FX-NEXUS-77)"
                  aria-label="Enter Waybill Code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-h-[44px] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text)] outline-none rounded-none focus:border-[var(--color-primary)] font-mono uppercase tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3 font-mono text-xs font-black uppercase tracking-widest cursor-pointer transition-colors duration-200 rounded-none flex items-center justify-center gap-2"
              >
                <span>Scan Operations Hub</span>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">search</span>
              </button>
            </form>
          </div>

          {/* Interactive Screen & Graphics (7 Cols) */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!searched ? (
                <motion.div
                  key="standby"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-primary)] p-6 lg:p-8 h-80 flex flex-col justify-between"
                >
                  {/* SVG Route Path Pulsar (Remotion style animation) */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <svg className="w-full h-full max-w-sm" viewBox="0 0 400 120">
                      {/* Grid Backing */}
                      <path d="M 0 30 L 400 30 M 0 60 L 400 60 M 0 90 L 400 90 M 100 0 L 100 120 M 200 0 L 200 120 M 300 0 L 300 120" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.2" />
                      
                      {/* Animated path */}
                      <motion.path
                        d="M 50 80 Q 200 10 350 70"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        initial={{ strokeDashoffset: 100 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
                      />

                      {/* Coordinates */}
                      <circle cx="50" cy="80" r="5" fill="var(--color-text)" />
                      <circle cx="350" cy="70" r="5" fill="var(--color-text)" />

                      {/* Moving packet */}
                      <motion.circle
                        cx="50"
                        cy="80"
                        r="6"
                        fill="var(--color-primary)"
                        animate={{
                          cx: [50, 200, 350],
                          cy: [80, 10, 70]
                        }}
                        transition={{
                          duration: 4,
                          ease: 'easeInOut',
                          repeat: Infinity,
                          repeatType: 'reverse'
                        }}
                      />
                      <circle cx="50" cy="80" r="10" fill="none" stroke="var(--color-primary)" strokeWidth="1" className="animate-ping" style={{ transformOrigin: '50px 80px' }} />
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[var(--color-text-dim)] border-t border-[var(--color-border)] pt-4">
                    <span>TELEMETRY STREAM: STANDBY</span>
                    <span>READY FOR QUERY</span>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6 lg:p-8 space-y-6"
                >
                  <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                    <div>
                      <h4 className="text-sm font-black font-mono text-[var(--color-text)]">FX-NEXUS-77</h4>
                      <p className="text-[10px] text-[var(--color-text-dim)] font-mono">STATUS: {result.status}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-[var(--color-primary-muted)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] px-2 py-0.5 font-bold">
                      VELOCITY LOCKED
                    </span>
                  </div>

                  {/* Route progress timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 font-mono text-xs">
                      <p className="text-[9px] text-[var(--color-text-dim)] uppercase mb-2">Details</p>
                      <p><strong>Origin:</strong> {result.origin.split(' (')[0]}</p>
                      <p className="mt-1"><strong>Destination:</strong> {result.destination.split(' (')[0]}</p>
                      <p className="mt-1"><strong>Weight:</strong> {result.weight}</p>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 font-mono text-xs">
                      <p className="text-[9px] text-[var(--color-text-dim)] uppercase mb-2">Checkpoints</p>
                      {result.checkpoints.map((cp, idx) => (
                        <div key={idx} className="mt-1.5 first:mt-0 flex justify-between">
                          <span>{cp.location}</span>
                          <span className="text-[var(--color-text-dim)]">{cp.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-8 text-center"
                >
                  <span className="material-symbols-outlined text-red-500 text-5xl mb-4" aria-hidden="true">database_off</span>
                  <h3 className="text-sm font-black font-mono uppercase text-red-500">Waybill ID Not Found</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Ensure the correct query parameter is entered and try again.
                  </p>
                  <button
                    onClick={() => setSearched(false)}
                    className="mt-6 border border-[var(--color-border)] hover:bg-[var(--color-surface-dim)] px-4 py-2 font-mono text-xs font-bold uppercase text-[var(--color-text)] cursor-pointer"
                  >
                    Reset Console
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
