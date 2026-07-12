'use client';

/**
 * /src/app/contact/page.tsx
 * Fast X Nexus — Contact & Operations Support Gateway
 *
 * Full-width sectioned layout matching the landing page design architecture:
 * Same GlassCards, useInView reveals, color tokens, and accent patterns.
 */

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';

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
            <span className="material-symbols-outlined text-[var(--color-accent)] text-[18px]" aria-hidden="true">support_agent</span>
            <span className="font-medium text-sm uppercase tracking-wider">Operations Support</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter">
            Get in{' '}
            <span className="text-[var(--color-accent)]">Touch.</span>
          </h1>

          <p className="text-lg lg:text-xl text-white/90 font-medium max-w-2xl leading-relaxed border-l-4 border-[var(--color-accent)] pl-4">
            Speed demands responsiveness. Our operations dispatchers monitor incoming requests around the clock — because efficiency doesn't stop at delivery. Reach out for support, enterprise partnerships, or technical integrations.
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

function ContactFormSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            Send Us a Message
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[var(--color-text-muted)] text-lg"
          >
            Fill out the form below and our support dispatcher will reach out within 1 hour.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
              {submitted ? (
                <div className="text-center py-16 space-y-4">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-6xl" aria-hidden="true">check_circle</span>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">Message Dispatched</h3>
                  <p className="text-[var(--color-text-muted)] max-w-sm mx-auto">
                    Your ticket has been logged in our operations queue. A support dispatcher will reach out within 1 hour.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                        Company
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                      Subject
                    </label>
                    <select className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer">
                      <option>General Inquiry</option>
                      <option>Shipment Support</option>
                      <option>Enterprise Partnership</option>
                      <option>Technical Integration</option>
                      <option>Billing & Payments</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
                      Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3.5 text-sm font-black uppercase tracking-widest cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </GlassCard>
          </motion.div>

          {/* Contact Info Cards */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <GlassCard className="p-6 lg:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">location_on</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">Regional Gateways</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { location: 'Lagos Main Office', address: '14 Logistics Way, Victoria Island, Lagos', email: 'lagos.nexus@fastx.com' },
                    { location: 'Abuja Station 3', address: '8 Central Terminal Rd, Garki, Abuja', email: 'abuja.nexus@fastx.com' },
                    { location: 'Port Harcourt Hub', address: '22 Cargo Bay Drive, Rumuomasi, PH', email: 'ph.nexus@fastx.com' },
                  ].map((hub) => (
                    <div key={hub.location} className="border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-bold text-[var(--color-text)]">{hub.location}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hub.address}</p>
                      <p className="text-xs font-bold text-[var(--color-primary)] mt-0.5">{hub.email}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <GlassCard className="p-6 lg:p-8 border-l-4 border-l-[var(--color-primary)]">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-accent)]" aria-hidden="true">schedule</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">SLA Guarantees</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Response Time', value: '< 1 hour' },
                    { label: 'Resolution SLA', value: '< 24 hours' },
                    { label: 'Availability', value: '24/7 Operations' },
                    { label: 'Priority Routing', value: 'Active Waybill Escalation' },
                  ].map((sla) => (
                    <div key={sla.label} className="flex justify-between items-center border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                      <span className="text-sm text-[var(--color-text-muted)]">{sla.label}</span>
                      <span className="text-sm font-bold text-[var(--color-text)]">{sla.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <ContactFormSection />
      </main>
      <Footer />
    </div>
  );
}
