'use client';

/**
 * SolutionsSection — Landing page section with API payload preview
 * and animated SVG network packet pathing.
 */

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const PAYLOADS = {
  booking: `{
  "route": "order.dispatch",
  "pickup": "871f1d4a0ffffff",
  "dropoff": "871f1d120ffffff",
  "dimensions": { "weight_kg": 14.5 }
}`,
  response: `{
  "dispatch_id": "disp_8f4a18",
  "status": "PAID_UNASSIGNED",
  "assigned_rider_id": null,
  "telemetry_stream": "active"
}`
};

export function SolutionsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const [tab, setTab] = useState<'booking' | 'response'>('booking');

  return (
    <section ref={ref} id="solutions-section" className="py-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Visual Packet Flow (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)] font-mono">
              API Telemetry Pipeline
            </h3>
            
            <div className="h-64 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-4" viewBox="0 0 200 200">
                {/* Router connections */}
                <line x1="100" y1="40" x2="50" y2="130" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="100" y1="40" x2="150" y2="130" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* API Client node */}
                <circle cx="100" cy="40" r="10" fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="100" y="58" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">NEXUS CLIENT</text>

                {/* Packet flows */}
                <motion.circle
                  cx="100"
                  cy="40"
                  r="4"
                  fill="var(--color-primary)"
                  animate={isInView ? {
                    cx: [100, 50, 100, 150, 100],
                    cy: [40, 130, 40, 130, 40]
                  } : {}}
                  transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
                />

                {/* Database gateway node */}
                <circle cx="50" cy="130" r="10" fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="50" y="148" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">DB ROUTER</text>

                {/* Webhook client node */}
                <circle cx="150" cy="130" r="10" fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="150" y="148" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">WEBHOOK</text>
              </svg>
            </div>
          </div>

          {/* Code specs & Text (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-text-dim)] mb-2">
                Enterprise / Integration Specs
              </p>
              <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-[var(--color-text)]">
                Developer Engine
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Direct webhook dispatches streaming active transit locations into your custom back-office infrastructure.
              </p>
            </div>

            {/* Interactive Console tabs */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-5">
              <div className="flex gap-2 border-b border-[var(--color-border)] pb-3 mb-3">
                {['booking', 'response'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t as 'booking' | 'response')}
                    className={`px-3 py-1 font-mono text-[9px] uppercase font-bold border rounded-none cursor-pointer ${
                      tab === t
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-muted)]/10'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {t === 'booking' ? 'DISPATCH_REQUEST' : 'DISPATCH_RESPONSE'}
                  </button>
                ))}
              </div>
              <pre className="font-mono text-xs text-[var(--color-text-muted)] overflow-x-auto leading-relaxed select-all">
                <code>{PAYLOADS[tab]}</code>
              </pre>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
