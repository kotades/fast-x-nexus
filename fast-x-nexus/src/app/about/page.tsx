'use client';

/**
 * /src/app/about/page.tsx
 * Fast X Nexus — About / Core Infrastructure Page
 *
 * Full-width sectioned layout matching the landing page design architecture:
 * Same GlassCards, useInView reveals, color tokens, and accent patterns.
 * Sections: Hero, Philosophy, Team, Milestones, TechStack, CTA
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';
import { AnimatedButton } from '@/components/landing/ui/AnimatedButton';

/* ─────────────── HERO ─────────────── */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white min-h-[50vh] flex items-center pt-[72px]"
    >
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/4" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--color-accent)]/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 relative z-10 w-full py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20">
            <span className="material-symbols-outlined text-[var(--color-accent)] text-[18px]" aria-hidden="true">precision_manufacturing</span>
            <span className="font-medium text-sm uppercase tracking-wider">Company Infrastructure</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter">
            Speed. Efficiency.{' '}
            <span className="text-[var(--color-accent)]">Transparency.</span>
          </h1>

          <p className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl leading-relaxed border-l-4 border-[var(--color-accent)] pl-4">
            Fast X Nexus is built on the Glass Factory ideology — every coordinate ping, every state transition, every dispatch event exposed in real-time. Because speed without visibility is just chaos.
          </p>
        </motion.div>
      </div>

      <div
        className="absolute bottom-0 right-0 z-20 h-24 w-1/2 bg-[var(--color-surface)]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
      />
    </section>
  );
}

/* ─────────────── PHILOSOPHY ─────────────── */
function PhilosophySection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

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
            Engineered for Speed, Built on Transparency
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Every system in our stack is designed to eliminate friction and push data outward — never to gate it. Efficiency is not a feature; it is the architecture.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {[
            {
              icon: 'bolt',
              title: 'Sub-Second Latency',
              desc: 'Every parcel state transition, rider coordinate, and warehouse checkpoint is published to your dashboard in under 500ms. Speed is not negotiable.',
            },
            {
              icon: 'hub',
              title: 'Hub-Centric Architecture',
              desc: 'Regional hubs across Lagos, Ibadan, Abuja, Port Harcourt, and Kano form a meshed network processing thousands of dispatches per hour with maximum efficiency.',
            },
            {
              icon: 'visibility',
              title: 'Open Telemetry',
              desc: 'No black boxes. Our H3-indexed spatial engine exposes raw coordinate streams and velocity locks directly to enterprise clients — total transparency.',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="h-full"
            >
              <GlassCard className="h-full p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[var(--color-primary-muted)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl" aria-hidden="true">
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

/* ─────────────── TEAM ─────────────── */
function TeamSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const team = [
    {
      name: 'Dunsimi Sanni',
      role: 'Founder & Chief Architect',
      icon: 'engineering',
      desc: 'Systems architect obsessed with sub-second latency and spatial indexing. Designed the H3-powered routing engine from scratch.',
    },
    {
      name: 'Operations Division',
      role: 'Dispatch & Logistics Ops',
      icon: 'local_shipping',
      desc: 'A lean team of fleet coordinators and dispatch operators managing real-time carrier assignments across 5 regional hubs.',
    },
    {
      name: 'Engineering Cell',
      role: 'Platform & Infrastructure',
      icon: 'terminal',
      desc: 'Full-stack engineers maintaining the Next.js monolith, Supabase edge functions, real-time telemetry pipelines, and WhatsApp OTP integrations.',
    },
    {
      name: 'Growth & Partnerships',
      role: 'Enterprise Sales & BD',
      icon: 'handshake',
      desc: 'Building strategic carrier partnerships and enterprise client pipelines to scale the Fast X network across West Africa.',
    },
  ];

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-[var(--color-surface-elevated)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 lg:mb-16 space-y-4 max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl lg:text-5xl font-black text-[var(--color-text)] tracking-tight"
          >
            The People Behind the Speed
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            A lean, high-velocity team building Africa&apos;s most efficient logistics infrastructure.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.12, duration: 0.6 }}
              className="h-full"
            >
              <GlassCard className="h-full p-6 lg:p-8 text-center border-t-4 border-t-[var(--color-primary)]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <span className="material-symbols-outlined text-white text-3xl" aria-hidden="true">
                    {member.icon}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">{member.name}</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mt-1 mb-4">
                  {member.role}
                </p>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{member.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── MILESTONES & METRICS ─────────────── */
function MilestonesSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const stats = [
    { value: '<500ms', label: 'API Sync Latency', icon: 'speed' },
    { value: '5', label: 'Regional Hubs Active', icon: 'pin_drop' },
    { value: '99.8%', label: 'Uptime SLA', icon: 'verified' },
    { value: '24/7', label: 'Dispatch Operations', icon: 'schedule' },
  ];

  const milestones = [
    { year: '2024', title: 'Platform Genesis', desc: 'Fast X Nexus codebase initiated. H3 spatial engine, Supabase RLS, and WhatsApp OTP authentication designed from first principles.' },
    { year: '2024', title: 'Lagos Hub Launch', desc: 'First regional dispatch hub activated in Victoria Island, Lagos. Initial rider fleet onboarded and first customer waybills generated.' },
    { year: '2025', title: 'Multi-Hub Expansion', desc: 'Abuja, Ibadan, Port Harcourt, and Kano hubs brought online. Cross-regional routing engine deployed with live telemetry.' },
    { year: '2025', title: 'Enterprise Pipeline', desc: 'API integrations, webhook event streams, and enterprise-grade Paystack billing activated for B2B logistics clients.' },
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
            Built Fast, Scaling Faster
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Key operational metrics and the milestones that brought us here.
          </motion.p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <GlassCard className="p-6 text-center border-t-4 border-t-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl mb-2 block" aria-hidden="true">
                  {stat.icon}
                </span>
                <p className="text-2xl lg:text-3xl font-black text-[var(--color-text)]">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mt-1">{stat.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-[var(--color-border)] lg:-translate-x-1/2" />

          <div className="space-y-8 lg:space-y-12">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + index * 0.15, duration: 0.6 }}
                className={`relative pl-12 lg:pl-0 lg:w-1/2 ${
                  index % 2 === 0 ? 'lg:pr-12 lg:text-right' : 'lg:ml-auto lg:pl-12'
                }`}
              >
                {/* Dot */}
                <div className="absolute left-2.5 lg:left-auto top-1 w-3 h-3 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-surface)]"
                  style={index % 2 === 0 ? { right: '-6.5px', left: 'auto' } : { left: '-6.5px' }}
                />

                <GlassCard className="p-6 border-l-4 border-l-[var(--color-primary)] lg:border-l-0 lg:border-b-4 lg:border-b-[var(--color-primary)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">{milestone.year}</span>
                  <h4 className="text-lg font-bold text-[var(--color-text)] mt-1">{milestone.title}</h4>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">{milestone.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── TECH STACK ─────────────── */
function TechStackSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

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
            Infrastructure Specifications
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            The technology components powering the Fast X routing engine — each optimised for speed and operational efficiency.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Large Card — Spatial Engine */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="md:col-span-2 md:row-span-2 relative"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary-muted)] rounded-full opacity-20 transform translate-x-1/4 -translate-y-1/4" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[var(--color-primary)]">
                    <span className="material-symbols-outlined text-white" aria-hidden="true">hexagon</span>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-[var(--color-text)] lg:text-3xl">
                    Uber H3 Spatial Indexing
                  </h3>
                  <p className="mb-6 max-w-md text-[var(--color-text-muted)]">
                    Resolution 7 hexagonal cells averaging 1.6km diameter. Every rider position and hub address is encoded as an integer H3 index, enabling sub-millisecond range queries without expensive geospatial database calculations.
                  </p>
                </div>

                {/* Inline SVG hex grid visualization */}
                <div className="h-32 w-full">
                  <svg className="w-full h-full" viewBox="0 0 300 100">
                    {[
                      { cx: 50, cy: 50 }, { cx: 90, cy: 30 }, { cx: 90, cy: 70 },
                      { cx: 130, cy: 50 }, { cx: 170, cy: 30 }, { cx: 170, cy: 70 },
                      { cx: 210, cy: 50 }, { cx: 250, cy: 30 }, { cx: 250, cy: 70 },
                    ].map((hex, idx) => (
                      <motion.polygon
                        key={idx}
                        points={`${hex.cx},${hex.cy - 14} ${hex.cx + 12},${hex.cy - 7} ${hex.cx + 12},${hex.cy + 7} ${hex.cx},${hex.cy + 14} ${hex.cx - 12},${hex.cy + 7} ${hex.cx - 12},${hex.cy - 7}`}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="1.5"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isInView ? { scale: 1, opacity: 1 } : {}}
                        transition={{ type: 'spring', damping: 12, stiffness: 80, delay: idx * 0.08 }}
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Card — Database */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between border-l-4 border-l-[var(--color-primary)]">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">database</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] lg:text-xl">
                    Supabase Postgres
                  </h4>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] lg:text-base">
                  RLS-enabled database with row-level security policies on every customer, rider, and order record.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="font-mono text-xs text-[var(--color-text-muted)]">Latency: &lt;50ms</span>
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Card — Messaging */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">chat</span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] lg:text-xl">
                    WhatsApp OTP Engine
                  </h4>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] lg:text-base">
                  Frictionless authentication via Baileys socket worker. No SMS fees, no email friction — maximum speed to sign-in.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
                <span className="font-mono text-xs text-[var(--color-text-muted)]">Delivery: &lt;2s</span>
                <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── CTA ─────────────── */
function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section ref={ref} className="py-16 lg:py-24 relative overflow-hidden bg-[var(--color-primary)] text-white">
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
            Experience the{' '}
            <span className="text-[var(--color-accent)]">Speed.</span>
          </h2>
          <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Join the Glass Factory. Start shipping with sub-second telemetry and maximum operational efficiency today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
        >
          <AnimatedButton href="/login" variant="secondary" size="lg">
            <span>Start Shipping Now</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </AnimatedButton>
          <AnimatedButton href="/contact" variant="primary" size="lg" className="bg-transparent border-2 border-white hover:bg-white/10 text-white">
            <span>Talk to Our Team</span>
            <span className="material-symbols-outlined" aria-hidden="true">chat</span>
          </AnimatedButton>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────── PAGE EXPORT ─────────────── */
export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <PhilosophySection />
        <TeamSection />
        <MilestonesSection />
        <TechStackSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
