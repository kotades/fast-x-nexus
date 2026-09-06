'use client';

/**
 * /src/app/booking/page.tsx
 * Fast X Nexus — Public Booking & Rate Estimation Portal
 *
 * Full-width sectioned layout matching the landing page design architecture:
 * Same GlassCards, useInView reveals, color tokens, and accent patterns.
 */

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';
import { AnimatedButton } from '@/components/landing/ui/AnimatedButton';

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white min-h-[50vh] flex items-center pt-[72px]"
    >

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 relative z-10 w-full py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20">
            <span className="material-symbols-outlined text-[var(--color-accent)] text-[18px]" aria-hidden="true">local_shipping</span>
            <span className="font-medium text-sm uppercase tracking-wider">Dispatch Portal</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter">
            Book a{' '}
            <span className="text-[var(--color-accent)]">Shipment.</span>
          </h1>

          <p className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl leading-relaxed border-l-4 border-[var(--color-accent)] pl-4">
            Calculate rates, select vehicle classes, and lock in pricing — all before signing in to generate your waybill.
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

function RateEstimator() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [weight, setWeight] = useState(10);
  const [distance, setDistance] = useState(250);

  const baseRate = 1200;
  const weightCharge = weight * 150;
  const distanceCharge = distance * 8;
  const totalCost = baseRate + weightCharge + distanceCharge;

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
            Instant Rate Calculator
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Drag the sliders to estimate your shipment cost based on weight and distance.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Calculator Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
              <div className="space-y-6">
                {/* Weight Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">Cargo Weight</span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{weight}kg</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-[var(--color-primary)] cursor-ew-resize h-2"
                  />
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                    <span>1kg</span>
                    <span>500kg</span>
                  </div>
                </div>

                {/* Distance Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">Transit Distance</span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{distance}km</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={1500}
                    value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full accent-[var(--color-primary)] cursor-ew-resize h-2"
                  />
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                    <span>10km</span>
                    <span>1,500km</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Price Breakdown Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <GlassCard className="p-6 lg:p-8 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">Cost Breakdown</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Base Transaction Fee', value: `₦${baseRate.toLocaleString()}` },
                    { label: 'Cargo Weight Charge', value: `₦${weightCharge.toLocaleString()}` },
                    { label: 'Transit Mileage Charge', value: `₦${distanceCharge.toLocaleString()}` },
                  ].map((line) => (
                    <div key={line.label} className="flex justify-between border-b border-[var(--color-border)] pb-2">
                      <span className="text-[var(--color-text-muted)]">{line.label}</span>
                      <span className="font-bold">{line.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-[var(--color-primary)] flex justify-between items-center">
                <span className="text-lg font-black uppercase text-[var(--color-text)]">Estimated Total</span>
                <span className="text-2xl font-black text-[var(--color-primary)]">₦{totalCost.toLocaleString()}</span>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function VehicleClassSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const vehicles = [
    {
      icon: 'local_shipping',
      name: 'Heavy Transport',
      range: '800km full tank',
      capacity: '15,000kg max',
      desc: 'Diesel trailers and rigid cargo carriers for intercity bulk freight.',
    },
    {
      icon: 'airport_shuttle',
      name: 'Urban Transit Van',
      range: '450km range',
      capacity: '3,500kg max',
      desc: 'Medium duty panel vans for metro-level package logistics.',
    },
    {
      icon: 'electric_bike',
      name: 'Last-Mile E-Bike',
      range: '120km battery',
      capacity: '150kg max',
      desc: 'Electric courier carriers for hyperlocal same-day deliveries.',
    },
  ];

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
            Choose Your Vehicle Class
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Select the carrier that matches your cargo requirements and delivery timeline.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="h-full"
            >
              <GlassCard className="h-full p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[var(--color-primary-muted)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl" aria-hidden="true">
                    {vehicle.icon}
                  </span>
                </div>
                <h3 className="mb-3 text-xl lg:text-2xl font-bold text-[var(--color-text)]">
                  {vehicle.name}
                </h3>
                <p className="leading-relaxed text-[var(--color-text-muted)] mb-4">{vehicle.desc}</p>
                <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex justify-between text-xs font-bold text-[var(--color-text-muted)]">
                  <span>{vehicle.capacity}</span>
                  <span>{vehicle.range}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingCTA() {
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
            Ready to{' '}
            <span className="text-[var(--color-accent)]">Ship?</span>
          </h2>
          <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Sign in to the secure dispatch portal to generate your waybill and lock in your estimated rate.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
        >
          <AnimatedButton href="/login?next=/customer" variant="secondary" size="lg">
            <span>Access Dispatch Portal</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </AnimatedButton>
          <AnimatedButton href="/contact" variant="primary" size="lg" className="bg-transparent border-2 border-white hover:bg-white/10 text-white">
            <span>Request Enterprise Quote</span>
            <span className="material-symbols-outlined" aria-hidden="true">request_quote</span>
          </AnimatedButton>
        </motion.div>
      </div>
    </section>
  );
}

export default function PublicBookingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <RateEstimator />
        <VehicleClassSection />
        <BookingCTA />
      </main>
      <Footer />
    </div>
  );
}
