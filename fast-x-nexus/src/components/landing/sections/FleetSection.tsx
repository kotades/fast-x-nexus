'use client';

/**
 * FleetSection — Landing page section with vehicle specifications
 * and Cargo Load Blueprint animated SVG outlines.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FLEETS = [
  {
    name: 'Class A: Heavy Transit',
    desc: 'Diesel Trailer & Heavy Rigid Cargo carriers.',
    limit: '15,000kg capacity',
    fill: 88,
    blueprintPath: 'M 10 70 L 190 70 L 190 30 L 110 30 L 110 10 L 30 10 L 30 50 L 10 50 Z',
    fillPath: 'M 35 15 L 105 15 L 105 65 L 35 65 Z'
  },
  {
    name: 'Class B: Urban Dispatch',
    desc: 'Medium Duty Panel Van for local logistics.',
    limit: '3,500kg capacity',
    fill: 62,
    blueprintPath: 'M 10 60 L 190 60 L 190 40 L 150 20 L 50 20 L 50 40 L 10 40 Z',
    fillPath: 'M 55 25 L 145 25 L 145 55 L 55 55 Z'
  },
  {
    name: 'Class C: Last-Mile Cargo',
    desc: 'Electric carrier & battery-swap courier e-bikes.',
    limit: '150kg capacity',
    fill: 35,
    blueprintPath: 'M 20 60 L 180 60 L 180 50 L 140 30 L 110 30 L 90 50 L 20 50 Z',
    fillPath: 'M 115 35 L 135 35 L 135 48 L 115 48 Z'
  }
];

export function FleetSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section ref={ref} id="fleet-section" className="py-20 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-12">
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-primary)] mb-2">
            Multimodal Grid / Carriers
          </p>
          <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-[var(--color-text)]">
            Logistics Fleet
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
            Multimodal dispatch specs detailing vehicle capabilities and payload volumes optimized under spring transit logic.
          </p>
        </div>

        {/* Vehicle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FLEETS.map((vehicle, index) => (
            <motion.div
              key={vehicle.name}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] border-t-[3.5px] border-t-[var(--color-primary)] p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-sm font-black font-mono uppercase text-[var(--color-text)] mb-1">
                  {vehicle.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">{vehicle.desc}</p>

                {/* SVG Blueprint Animation */}
                <div className="h-36 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] mb-4 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full p-3" viewBox="0 0 200 80">
                    {/* Backing Grid */}
                    <path d="M 0 20 L 200 20 M 0 40 L 200 40 M 0 60 L 200 60 M 50 0 L 50 80 M 100 0 L 100 80 M 150 0 L 150 80" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.25" />
                    
                    {/* Outline */}
                    <path d={vehicle.blueprintPath} fill="none" stroke="var(--color-text-dim)" strokeWidth="2" />
                    
                    {/* Cargo Level Indicator (Spring Fill) */}
                    <motion.path
                      d={vehicle.fillPath}
                      fill="var(--color-primary)"
                      opacity="0.25"
                      initial={{ scaleY: 0 }}
                      animate={isInView ? { scaleY: vehicle.fill / 100 } : {}}
                      style={{ transformOrigin: 'bottom' }}
                      transition={{ type: 'spring', damping: 15, stiffness: 80, delay: index * 0.1 + 0.3 }}
                    />
                  </svg>
                  <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[var(--color-text-dim)]">
                    BLUEPRINT LEVEL: {vehicle.fill}%
                  </div>
                </div>

                <div className="font-mono text-[10px] text-[var(--color-text-dim)] flex justify-between border-t border-[var(--color-border)] pt-3">
                  <span>CAPACITY SLA</span>
                  <span className="font-bold text-[var(--color-text)]">{vehicle.limit}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
