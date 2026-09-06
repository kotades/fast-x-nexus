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
      {/* Floating abstract orbs */}
      <GlowingOrb
        size={384}
        color="rgba(165, 244, 153, 0.3)"
        pulseDuration={3}
        position={{ x: 25, y: 25 }}
      />
      <GlowingOrb
        size={320}
        color="rgba(254, 191, 40, 0.25)"
        pulseDuration={2.5}
        position={{ x: 75, y: 75 }}
      />

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left: Text Content - High Contrast Industrial */}
          <div className="space-y-6 py-12 lg:py-16">
            {/* Response Time Promise Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 rounded-none text-xs font-mono font-bold uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[var(--color-accent)] text-[18px]" aria-hidden="true">bolt</span>
              <span className="text-white">Instant Courier Dispatch Within 15 Minutes Across Lagos</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-7xl font-black font-sans leading-tight tracking-tighter text-white"
            >
              <TypewriterText text="Speed. Efficiency." speed={15} className="block text-white" />
              <span className="text-[var(--color-accent)] block">
                <TypewriterText text="Delivered." speed={15} className="block" />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-base lg:text-lg text-white/80 font-sans max-w-2xl leading-relaxed border-l-4 border-[var(--color-accent)] pl-4"
            >
              High-velocity logistics infrastructure engineered for Lagos enterprises.
              Sub-second H3 spatial routing, instant courier assignment, and cryptographic
              dual-PIN delivery verification.
            </motion.p>

            {/* CTA Buttons & Hotline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="space-y-4 pt-2"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <AnimatedButton href="/booking" variant="secondary" size="lg" className="min-h-[48px] rounded-none">
                  <span>Start Shipping Now</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" aria-hidden="true">
                    arrow_forward
                  </span>
                </AnimatedButton>
                <AnimatedButton href="#tracking-section" variant="primary" size="lg" className="min-h-[48px] rounded-none bg-transparent border-2 border-white hover:bg-white/10 text-white">
                  <span className="material-symbols-outlined" aria-hidden="true">radar</span>
                  <span>Track Waybill</span>
                </AnimatedButton>
              </div>

              {/* Direct Hotline Pill */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/70 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DISPATCH ACTIVE</span>
                </span>
                <span className="text-white/30">•</span>
                <a
                  href="tel:+2349014030047"
                  className="hover:text-[var(--color-accent)] transition-colors inline-flex items-center gap-1 min-h-[44px]"
                  aria-label="Call Lagos Dispatch Hotline: +2349014030047"
                >
                  <span className="material-symbols-outlined text-sm text-[var(--color-accent)]" aria-hidden="true">call</span>
                  <span>HOTLINE: +234 901 403 0047</span>
                </a>
              </div>
            </motion.div>
          </div>

          {/* Right: Dashboard Mockup */}
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

      {/* Diagonal structural element */}
      <div
        className="absolute bottom-0 right-0 z-20 h-16 w-1/3 bg-[var(--color-surface)] pointer-events-none"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
    </section>
  );
}