"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { DataVisualization } from "../animations/DataVisualization";

export function OperationsIntel() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const graphData = [20, 40, 35, 60, 50, 80, 45];

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-[var(--color-surface-elevated)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 space-y-4 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-5xl font-bold text-[var(--color-text)]"
          >
            Operations Intelligence
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Harness real-time data and AI-driven insights to maintain absolute control over your fluid logistics network.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Large Card - AI Optimization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="md:col-span-2 md:row-span-2 relative"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              {/* Background gradient effect */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary-muted)] rounded-full opacity-20 transform translate-x-1/4 -translate-y-1/4" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]">
                    <span className="material-symbols-outlined text-white">route</span>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-[var(--color-text)] lg:text-3xl">
                    AI Optimization & Routing
                  </h3>
                  <p className="mb-6 max-w-md text-[var(--color-text-muted)]">
                    Our neural network continuously evaluates traffic, weather, and facility throughput to dynamically
                    reroute assets, ensuring zero downtime.
                  </p>
                </div>

                {/* Animated Graph */}
                <DataVisualization data={graphData} isInView={isInView} />
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Card - Real-time Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="col-span-1 row-span-1"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between border-l-4 border-l-[var(--color-primary)]">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-accent)]">radar</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] lg:text-xl">
                    Real-time Tracking
                  </h4>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] lg:text-base">
                  Sub-second latency on asset location and status updates.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="font-mono text-xs text-[var(--color-text-muted)]">Latency: 12ms</span>
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Card - Data Transparency */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="col-span-1 row-span-1"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">dataset</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] lg:text-xl">
                    Data Transparency
                  </h4>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] lg:text-base">
                  Immutable ledger logs for every transaction and movement.
                </p>
              </div>
              <a
                href="/tracking"
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-primary)] hover:underline min-h-[44px]"
              >
                <span>View Telemetry Logs</span>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_forward</span>
              </a>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
