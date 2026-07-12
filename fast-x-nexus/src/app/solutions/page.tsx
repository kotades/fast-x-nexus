'use client';

/**
 * /src/app/solutions/page.tsx
 * Fast X Nexus — Enterprise Solutions & Developer Console
 *
 * Expansive documentation page displaying API webhook payloads,
 * response templates, and a dynamic SVG server-packet pipeline animation.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

const CODE_EXAMPLES = {
  booking: `{
  "action": "order.create",
  "payload": {
    "pickup_h3_cell": "871f1d4a0ffffff",
    "dropoff_h3_cell": "871f1d120ffffff",
    "cargo": {
      "weight": 14.5,
      "description": "Enterprise Server Rack"
    },
    "metadata": {
      "sender_ref": "REF-8849-AC"
    }
  }
}`,
  webhook: `{
  "event": "order.state_transition",
  "previous_state": "ASSIGNED",
  "current_state": "PICKED_UP",
  "transition_timestamp": "2026-07-03T00:57:37Z",
  "telemetry": {
    "velocity_kmh": 68.4,
    "current_h3_cell": "871f1d4b6ffffff"
  }
}`
};

export default function SolutionsPage() {
  const [activeTab, setActiveTab] = useState<'booking' | 'webhook'>('booking');

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: API Documentation */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-text-dim)] mb-2">
              Solutions / API Integration
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-text">Developer Specifications</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl">
              Integrate the Fast X Nexus routing engine directly into your enterprise ERP systems via raw JSON APIs and live-updating webhooks.
            </p>
          </div>

          {/* Interactive Code Console */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4 mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono">
                API JSON Payload Schemas
              </h3>
              <div className="flex gap-2">
                {['booking', 'webhook'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as 'booking' | 'webhook')}
                    className={`px-3 py-1 font-mono text-[10px] uppercase font-bold border transition-colors duration-200 cursor-pointer rounded-none ${
                      activeTab === tab
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-muted)]/10'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {tab === 'booking' ? 'CREATE_ORDER' : 'WEBHOOK_EVENT'}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Output Panel */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 overflow-x-auto relative">
              <pre className="font-mono text-xs text-[var(--color-text-muted)] leading-relaxed select-all">
                <code>{CODE_EXAMPLES[activeTab]}</code>
              </pre>
              <span className="absolute top-2 right-2 text-[8px] font-mono uppercase bg-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-text-dim)]">
                JSON Schema
              </span>
            </div>
          </div>

          {/* Webhook Delivery Log Mock */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              Mock Webhook Delivery Ledger
            </h3>
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">Event ID</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">Route Target</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">HTTP Code</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {[
                    { id: 'evt_8f4a188', target: 'POST /webhooks/nexus-transit', code: '200 OK', latency: '42ms' },
                    { id: 'evt_71f49a2', target: 'POST /webhooks/nexus-transit', code: '200 OK', latency: '38ms' },
                    { id: 'evt_1d46b7a', target: 'POST /webhooks/nexus-transit', code: '201 CREATED', latency: '121ms' }
                  ].map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 text-[var(--color-text)] font-bold">{row.id}</td>
                      <td className="p-3 text-[var(--color-text-muted)]">{row.target}</td>
                      <td className="p-3 text-emerald-500 font-bold">{row.code}</td>
                      <td className="p-3 text-[var(--color-text-muted)]">{row.latency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Pipeline Animation & Benefits */}
        <div className="space-y-6">
          {/* SVG Pipeline Animation */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              Real-time API Packet Flow
            </h3>

            <div className="h-64 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-4" viewBox="0 0 200 200">
                {/* Connection lines */}
                <line x1="100" y1="30" x2="50" y2="120" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="100" y1="30" x2="150" y2="120" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 2" />
                
                {/* Client Node */}
                <circle cx="100" cy="30" r="10" fill="var(--color-surface-elevated)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="100" y="48" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">API CLIENT</text>

                {/* API Gateway Packet flows */}
                <motion.circle
                  cx="100"
                  cy="30"
                  r="4"
                  fill="var(--color-primary)"
                  animate={{
                    cx: [100, 50, 100, 150, 100],
                    cy: [30, 120, 30, 120, 30]
                  }}
                  transition={{
                    duration: 6,
                    ease: 'linear',
                    repeat: Infinity
                  }}
                />

                {/* DB Node */}
                <circle cx="50" cy="120" r="10" fill="var(--color-surface-elevated)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="50" y="138" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">DB ROUTER</text>

                {/* Webhook Gateway Node */}
                <circle cx="150" cy="120" r="10" fill="var(--color-surface-elevated)" stroke="var(--color-text)" strokeWidth="2" />
                <text x="150" y="138" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace" textAnchor="middle">WEBHOOK</text>
              </svg>
            </div>
          </div>

          {/* Benefits spec list */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              Developer Capabilities
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Sub-second webhook updates', desc: 'Active rider coordinate telemetry dispatching under 500ms latency.' },
                { title: 'State Transition Safety', desc: 'Secure database FSM constraints prevent invalid logistics path progressions.' },
                { title: 'Payload Validation SLA', desc: 'Schema-first input sanitization guarantees invalid fields fail at Gateway level.' }
              ].map((benefit) => (
                <div key={benefit.title} className="border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
                  <h4 className="text-xs font-bold uppercase text-[var(--color-text)] font-sans">{benefit.title}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
