"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";

export function ValueProp() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const features = [
    {
      icon: "my_location",
      title: "Precision Tracking",
      desc: "Pinpoint every asset globally with millimeter accuracy using our low-latency satellite mesh network.",
    },
    {
      icon: "event_available",
      title: "Instant Booking",
      desc: "Secure capacity across land, sea, and air within milliseconds via our integrated global ledger.",
    },
    {
      icon: "route",
      title: "Dynamic Routing",
      desc: "AI-driven pathfinding adapts to traffic, weather, and geopolitical shifts in real-time to guarantee delivery.",
    },
  ];

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-[var(--color-surface)] hex-pattern">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16 space-y-4 max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-5xl font-black text-[var(--color-text)] tracking-tight"
          >
            The Engine Driving Your Supply Chain
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Precision engineering meets rapid deployment. Our ecosystem provides complete visibility and control over
            every asset in motion.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="h-full"
            >
              <GlassCard className="h-full p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[var(--color-primary-muted)] rounded-lg">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="mb-3 text-xl lg:text-2xl font-bold text-[var(--color-text)]">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-[var(--color-text-muted)]">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
