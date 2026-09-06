"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AnimatedButton } from "../ui/AnimatedButton";

export function ConversionCTA() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="py-16 lg:py-24 relative overflow-hidden bg-[var(--color-primary)] text-white border-b border-[var(--color-border)]">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8 relative z-10 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/20 border border-white/20 text-xs font-mono font-bold uppercase tracking-wider text-white">
            <span className="material-symbols-outlined text-[var(--color-accent)] text-sm" aria-hidden="true">bolt</span>
            <span>Instant Courier Dispatch Within 15 Minutes Across Lagos</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter leading-tight font-sans">
            Ready to Transform Your <br />
            <span className="text-[var(--color-accent)]">Logistics Intelligence?</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto font-sans">
            Join the next generation of enterprise shipping in Nigeria. Experience absolute visibility,
            sub-second latency, and H3-driven micro-routing today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2"
        >
          <AnimatedButton href="/booking" variant="secondary" size="lg" className="min-h-[48px] rounded-none">
            <span>Book Express Dispatch</span>
            <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
          </AnimatedButton>
          <AnimatedButton href="/contact" variant="primary" size="lg" className="min-h-[48px] rounded-none bg-transparent border-2 border-white hover:bg-white/10 text-white">
            <span>Contact Operations</span>
            <span className="material-symbols-outlined" aria-hidden="true">chat</span>
          </AnimatedButton>
        </motion.div>

        {/* Direct Contact Links */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-white/80">
          <a
            href="tel:+2349014030047"
            className="hover:text-[var(--color-accent)] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            aria-label="Call Dispatch Hotline: +2349014030047"
          >
            <span className="material-symbols-outlined text-sm text-[var(--color-accent)]" aria-hidden="true">call</span>
            <span>+234 901 403 0047</span>
          </a>
          <span className="text-white/30 hidden sm:inline">•</span>
          <a
            href="mailto:operations@fastx.ng"
            className="hover:text-[var(--color-accent)] transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            aria-label="Email Operations: operations@fastx.ng"
          >
            <span className="material-symbols-outlined text-sm text-[var(--color-accent)]" aria-hidden="true">mail</span>
            <span>operations@fastx.ng</span>
          </a>
        </div>
      </div>
    </section>
  );
}
