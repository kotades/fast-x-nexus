'use client';

/**
 * NetworkSection — Landing page section with H3 grid indexing details
 * and cascading vector Hexagon Matrix SVG.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function NetworkSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section ref={ref} id="network-section" className="py-20 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-primary)] mb-2">
              Spatial Grid / Cell Indexing
            </p>
            <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tight text-[var(--color-text)]">
              Hexagonal Indexing
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              We abstract regional hubs and rider positions into resolution 7 H3 hex indexes. This reduces geographic search complexity to simple indexed integer compares, accelerating waybill routing.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { title: 'Resolution 7 H3 grid', desc: 'Hexagonal cell diameter averaging 1.6km for micro-dispatching.' },
                { title: 'Zero Latency Range Query', desc: 'No heavy geospatial database distance calculations.' }
              ].map((item) => (
                <div key={item.title} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
                  <h4 className="text-xs font-bold uppercase font-sans text-[var(--color-text)]">{item.title}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hexagon Matrix (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="h-64 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-4" viewBox="0 0 160 160">
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
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{
                      type: 'spring',
                      damping: 12,
                      stiffness: 80,
                      delay: hex.delay
                    }}
                    whileHover={{ fill: 'rgba(34, 197, 94, 0.15)' }}
                  />
                ))}
              </svg>
              <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[var(--color-text-dim)]">
                CASCADE MATRIX ACTIVE
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
