"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { GlowingOrb } from "../animations/GlowingOrb";
import { TypewriterText } from "../animations/TypewriterText";
import { DashboardMockup } from "../animations/DashboardMockup";
import { AnimatedButton } from "../ui/AnimatedButton";

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(heroRef, { once: true, amount: 0.5 });

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white min-h-[85vh] flex items-center pt-[72px]"
    >
      {/* Floating abstract orbs - from Fluid-High-Tech design */}
      <GlowingOrb
        size={384} // 96 * 4 for larger effect
        color="rgba(165, 244, 153, 0.3)"
        pulseDuration={3}
        position={{ x: 25, y: 25 }}
      />
      <GlowingOrb
        size={320} // 80 * 4
        color="rgba(254, 191, 40, 0.25)"
        pulseDuration={2.5}
        position={{ x: 75, y: 75 }}
      />

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left: Text Content - from Industrial design */}
          <div className="space-y-8 py-16">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20"
            >
              <span className="material-symbols-outlined text-[var(--color-accent)] text-[18px]">bolt</span>
              <span className="font-medium text-sm uppercase tracking-wider">Next-Gen Logistics Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-7xl font-black leading-tight tracking-tighter"
            >
              <TypewriterText text="Speed. Efficiency." speed={15} className="block" />
              <span className="text-[var(--color-accent)]">
                <TypewriterText text="Delivered." speed={15} className="block" />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl leading-relaxed border-l-4 border-[var(--color-accent)] pl-4"
            >
              Built for speed, engineered for efficiency. Real-time tracking, instant booking, and seamless delivery management — every millisecond optimised for the modern enterprise.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <AnimatedButton href="/signup" variant="secondary" size="lg">
                <span>Start Shipping Now</span>
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </AnimatedButton>
              <AnimatedButton href="#demo" variant="primary" size="lg" className="bg-transparent border-2 border-white hover:bg-white/10 text-white">
                <span className="material-symbols-outlined">play_circle</span>
                <span>See How It Works</span>
              </AnimatedButton>
            </motion.div>
          </div>

          {/* Right: Dashboard Mockup - from Fluid-High-Tech design */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative w-full h-[400px] lg:h-[550px] hidden lg:flex items-center justify-center"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </div>

      {/* Diagonal structural element - from Industrial design */}
      <div
        className="absolute bottom-0 right-0 z-20 h-24 w-1/2 bg-[var(--color-surface)]"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
    </section>
  );
}