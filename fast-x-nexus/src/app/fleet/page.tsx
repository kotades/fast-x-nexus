'use client';

/**
 * /src/app/fleet/page.tsx
 * Fast X Nexus — Fleet Specifications & Cargo Classes
 *
 * Swiss grid detailing different vehicle classes, loading metrics, range specs,
 * and vector-based animated payload wireframes using Framer Motion.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

const VEHICLES = [
  {
    name: 'Class A: Heavy Transport',
    type: 'Diesel Trailer & Heavy Rigid Cargo',
    capacity: '15,000kg max load',
    volume: '85m³ cargo bay',
    range: '800km full tank',
    status: 'ACTIVE PIPELINE',
    fillPercentage: 88,
    blueprintPath: 'M 10 70 L 190 70 L 190 30 L 110 30 L 110 10 L 30 10 L 30 50 L 10 50 Z', // Blocky truck outline
    fillPath: 'M 35 15 L 105 15 L 105 65 L 35 65 Z'
  },
  {
    name: 'Class B: Urban Transit',
    type: 'Medium Duty Panel Van',
    capacity: '3,500kg max load',
    volume: '15m³ cargo bay',
    range: '450km range',
    status: 'ACTIVE PIPELINE',
    fillPercentage: 62,
    blueprintPath: 'M 10 60 L 190 60 L 190 40 L 150 20 L 50 20 L 50 40 L 10 40 Z', // Blocky van outline
    fillPath: 'M 55 25 L 145 25 L 145 55 L 55 55 Z'
  },
  {
    name: 'Class C: Last-Mile Express',
    type: 'Cargo E-Bike / Compact Carrier',
    capacity: '150kg max load',
    volume: '0.45m³ courier box',
    range: '120km battery swap',
    status: 'LAST MILE DELIVERIES',
    fillPercentage: 35,
    blueprintPath: 'M 20 60 L 180 60 L 180 50 L 140 30 L 110 30 L 90 50 L 20 50 Z', // Blocky bike/carrier outline
    fillPath: 'M 115 35 L 135 35 L 135 48 L 115 48 Z'
  }
];

export default function FleetPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full space-y-12">
        {/* Header Hero */}
        <div>
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-text-dim)] mb-2">
            Operations / Logistics Fleet
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-text">Fleet Specifications</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl">
            Detailed layouts and cargo capacity metrics for our multimodal last-mile and cross-country logistics grid.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {VEHICLES.map((vehicle, idx) => (
            <motion.div
              key={vehicle.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-primary)] p-6 flex flex-col justify-between"
            >
              <div>
                {/* Blueprint Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider font-mono text-[var(--color-text)]">
                      {vehicle.name}
                    </h2>
                    <p className="text-[10px] text-[var(--color-text-dim)] font-mono">{vehicle.type}</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-[var(--color-primary-muted)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] px-2 py-0.5">
                    {vehicle.status}
                  </span>
                </div>

                {/* Animated Cargo Load Blueprint (Remotion style) */}
                <div className="h-40 bg-[var(--color-surface)] border border-[var(--color-border)] mb-6 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full p-4" viewBox="0 0 200 80">
                    {/* Grid backing */}
                    <path d="M 0 20 L 200 20 M 0 40 L 200 40 M 0 60 L 200 60 M 40 0 L 40 80 M 80 0 L 80 80 M 120 0 L 120 80 M 160 0 L 160 80" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />
                    
                    {/* Vehicle Outline */}
                    <path
                      d={vehicle.blueprintPath}
                      fill="none"
                      stroke="var(--color-text-dim)"
                      strokeWidth="2"
                      strokeLinejoin="miter"
                    />

                    {/* Cargo Load Fill (Dynamic Spring) */}
                    <motion.path
                      d={vehicle.fillPath}
                      fill="var(--color-primary)"
                      opacity="0.3"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: vehicle.fillPercentage / 100 }}
                      style={{ transformOrigin: 'bottom' }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    />
                  </svg>
                  <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[var(--color-text-dim)]">
                    LOAD: {vehicle.fillPercentage}% CAPACITY
                  </div>
                </div>

                {/* Tech Specs list */}
                <div className="space-y-3 font-mono text-xs mb-6">
                  {[
                    { label: 'Weight Limit', value: vehicle.capacity },
                    { label: 'Volume Space', value: vehicle.volume },
                    { label: 'Operational Range', value: vehicle.range }
                  ].map((spec) => (
                    <div key={spec.label} className="flex justify-between border-b border-[var(--color-border)] pb-1.5">
                      <span className="text-[var(--color-text-muted)] font-black uppercase text-[9px]">{spec.label}</span>
                      <span className="font-bold text-[var(--color-text)]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)] border border-[var(--color-border)] py-2 text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text)] cursor-pointer rounded-none transition-colors duration-200">
                Deploy Unit
              </button>
            </motion.div>
          ))}
        </div>

        {/* Global Fleet Utilization Stats */}
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
            Network Dispatch Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Overall Capacity utilization', value: '71.2%' },
              { label: 'Active Fleet Units', value: '144 units active' },
              { label: 'Maintenance Cycles', value: '99.1% readiness' },
              { label: 'Transit Emissions Index', value: '4.2 gCO2e/kg-km' }
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
                <p className="text-[9px] font-mono font-black uppercase text-[var(--color-text-dim)]">{stat.label}</p>
                <p className="text-lg font-black font-sans uppercase mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
