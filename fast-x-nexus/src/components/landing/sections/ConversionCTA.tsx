"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AnimatedButton } from "../ui/AnimatedButton";

export function ConversionCTA() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="py-16 lg:py-24 relative overflow-hidden bg-[var(--color-primary)] text-white">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--color-accent)]/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="max-w-screen-xl mx-auto px-6 lg:px-8 relative z-10 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-4xl lg:text-6xl font-black tracking-tighter leading-tight">
            Ready to Transform Your <br />
            <span className="text-[var(--color-accent)]">Logistics Intelligence?</span>
          </h2>
          <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Join the next generation of enterprise shipping. Experience absolute visibility, 
            sub-second latency, and AI-driven routing today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
        >
          <AnimatedButton href="/signup" variant="secondary" size="lg">
            <span>Get Started for Free</span>
            <span className="material-symbols-outlined">bolt</span>
          </AnimatedButton>
          <AnimatedButton href="/contact" variant="primary" size="lg" className="bg-transparent border-2 border-white hover:bg-white/10 text-white">
            <span>Talk to an Expert</span>
            <span className="material-symbols-outlined">chat</span>
          </AnimatedButton>
        </motion.div>
      </div>
    </section>
  );
}
