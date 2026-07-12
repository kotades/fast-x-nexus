'use client';

/**
 * /src/app/network/page.tsx
 * Fast X Nexus — Logistics Network Index & H3 Coordinates
 *
 * Expansive layouts covering H3 resolution 7 cellular grids, regional hub locations,
 * and cascading vector hexagons entrance using Framer Motion.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

const REGIONAL_HUBS = [
  { name: 'Lagos Hub Alpha', h3Cell: '871f1d4a0ffffff', lat: '6.5244° N', lng: '3.3792° E', status: 'OPERATIONAL' },
  { name: 'Ibadan Sorting Facility', h3Cell: '871f1d4b6ffffff', lat: '7.3775° N', lng: '3.9470° E', status: 'OPERATIONAL' },
  { name: 'Abuja Central Terminal', h3Cell: '871f1d120ffffff', lat: '9.0765° N', lng: '7.3986° E', status: 'OPERATIONAL' },
  { name: 'Port Harcourt Cargo Bay', h3Cell: '871f1d532ffffff', lat: '4.8156° N', lng: '7.0498° E', status: 'OPERATIONAL' },
  { name: 'Kano Logistics Center', h3Cell: '871f1d044ffffff', lat: '12.0022° N', lng: '8.5920° E', status: 'MAINTENANCE' }
];

export default function NetworkPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Isometric H3 Hexagonal Grid Entrance */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              H3 Cellular Coverage
            </h3>

            {/* Cascading Hexagon grid */}
            <div className="h-64 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-4" viewBox="0 0 160 160">
                {/* Isometric hexagonal cell outline layout */}
                {[
                  { cx: 80, cy: 50, delay: 0 },
                  { cx: 50, cy: 68, delay: 0.1 },
                  { cx: 110, cy: 68, delay: 0.2 },
                  { cx: 50, cy: 102, delay: 0.3 },
                  { cx: 110, cy: 102, delay: 0.4 },
                  { cx: 80, cy: 120, delay: 0.5 }
                ].map((hex, idx) => (
                  <motion.polygon
                    key={idx}
                    points={`${hex.cx},${hex.cy - 16} ${hex.cx + 14},${hex.cy - 8} ${hex.cx + 14},${hex.cy + 8} ${hex.cx},${hex.cy + 16} ${hex.cx - 14},${hex.cy + 8} ${hex.cx - 14},${hex.cy - 8}`}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="1.5"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      damping: 12,
                      stiffness: 80,
                      delay: hex.delay
                    }}
                    whileHover={{ fill: 'rgba(34, 197, 94, 0.2)' }}
                  />
                ))}
              </svg>
              <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[var(--color-text-dim)]">
                CASCADE ASSEMBLY: COMPLETE
              </div>
            </div>
          </div>

          {/* H3 Index Description card */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-2">
              Why H3 Spatial Indexes?
            </h4>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Fast X Nexus abstracts traditional latitudes and longitudes into discrete, hexagonal H3 grid addresses. This ensures telemetry lookup matrices are cached locally on edge-routers, reducing tail latency during active rider transits.
            </p>
          </div>
        </div>

        {/* Right Columns: Regional Hub Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-text-dim)] mb-2">
              Network / Hub Directory
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-text">Regional Logistics Hubs</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl">
              Systematic directories mapping our physical storage hubs, coordinates, and resolution 7 H3 indexing ranges.
            </p>
          </div>

          {/* Directory Table */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6 border-l-[3px] border-l-[var(--color-primary)]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              Regional Gateways Directory
            </h3>

            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">Hub Name</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">H3 Index</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">Coordinates</th>
                    <th className="p-3 text-[10px] uppercase font-black text-[var(--color-text-dim)]">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {REGIONAL_HUBS.map((hub) => (
                    <tr key={hub.name}>
                      <td className="p-3 text-[var(--color-text)] font-bold">{hub.name}</td>
                      <td className="p-3 text-[var(--color-primary)] font-bold">{hub.h3Cell}</td>
                      <td className="p-3 text-[var(--color-text-muted)]">{hub.lat}, {hub.lng}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${
                          hub.status === 'OPERATIONAL'
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-muted)]/10'
                            : 'border-amber-500/50 text-amber-500 bg-amber-500/10'
                        }`}>
                          {hub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Infrastructure Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Grid Area Covered', value: '445,000 km²' },
              { label: 'Average Hub-to-Hub Transit', value: '4 hrs 12 mins' },
              { label: 'Resolution Density Index', value: '98.4%' }
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-4">
                <p className="text-[9px] font-mono font-black uppercase text-[var(--color-text-dim)]">{stat.label}</p>
                <p className="text-xs font-black uppercase mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
