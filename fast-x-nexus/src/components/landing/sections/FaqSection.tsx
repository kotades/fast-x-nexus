'use client';

/**
 * /src/components/landing/sections/FaqSection.tsx
 * Fast X Nexus — Real Lagos Logistics FAQ Section
 *
 * Implements:
 * 1. 5 comprehensive Lagos logistics FAQs:
 *    - Coverage in Lagos (Island & Mainland H3 hex cell clusters)
 *    - Delivery timelines (Instant courier dispatch within 15 mins promise + 45-90 min delivery)
 *    - Payment options (Paystack automated settlement, Cards, Bank Transfer, USSD)
 *    - Fragile & high-value cargo (Dual-PIN authentication POP/POD + transit insurance)
 *    - Live GPS & waybill tracking (Sub-second telemetry without app downloads)
 * 2. Response time promise banner: "Instant Courier Dispatch Within 15 Minutes Across Lagos"
 * 3. Direct clickable dispatch links: tel:+2349014030047 and mailto:operations@fastx.ng
 * 4. Touch targets >= 44px on all accordion triggers
 * 5. Industrial high-contrast styling with 0 emojis in headings
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'coverage',
    category: 'GEOSPATIAL COVERAGE',
    icon: 'map',
    question: 'Which areas across Lagos does Fast X Nexus cover?',
    answer: 'We provide comprehensive spatial coverage across both Lagos Island and Mainland. High-velocity clusters include Ikeja, Victoria Island, Lekki Phase 1 & 2, Ikoyi, Yaba, Surulere, Maryland, Apapa, Ikorodu, and the entire Epe expressway corridor. Every service area is mapped to resolution 7 H3 hexagonal micro-cells (1.6km diameter) to guarantee immediate dispatch to the nearest courier.',
  },
  {
    id: 'timelines',
    category: 'DISPATCH SLAs',
    icon: 'timer',
    question: 'What are your delivery timelines and dispatch guarantees?',
    answer: 'We operate under our binding promise: Instant Courier Dispatch Within 15 Minutes Across Lagos. Once your shipment is booked and verified, our automated dispatch algorithm assigns the closest active courier in real-time. Intra-city deliveries generally arrive within 45 to 90 minutes, depending on corridor transit conditions.',
  },
  {
    id: 'payments',
    category: 'FINANCIAL SETTLEMENT',
    icon: 'payments',
    question: 'What payment methods are supported for booking shipments?',
    answer: 'Fast X Nexus integrates automated, PCI-DSS compliant checkout powered by Paystack. Customers can pay via all Nigerian Debit and Credit cards (Mastercard, Visa, Verve), instant Bank Transfer using auto-generated dynamic virtual accounts, and USSD banking codes. Corporate and high-volume merchant accounts can also request consolidated weekly invoicing.',
  },
  {
    id: 'fragile-cargo',
    category: 'CARGO PROTECTION',
    icon: 'verified_user',
    question: 'How do you handle fragile, high-value, or sensitive items?',
    answer: 'All high-value and sensitive cargo is secured with tamper-evident protocol locks and requires dual-PIN cryptographic verification: the sender must authorize cargo release with a 4-digit Proof of Pickup (POP) PIN, and the courier can only complete delivery after entering the recipient\'s 4-digit Proof of Delivery (POD) PIN. Verified packages are covered by goods-in-transit liability up to declared value.',
  },
  {
    id: 'tracking',
    category: 'LIVE TELEMETRY',
    icon: 'radar',
    question: 'How do I track my shipment and courier in real time?',
    answer: 'Every order generates an immutable waybill identifier (e.g. FX-97DEF3). Senders and recipients can enter this code into our real-time Waybill Telemetry tracker at any time to monitor exact courier GPS coordinates, transit velocity, H3 zone transitions, and milestone timestamps with sub-second latency—no application download required.',
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('timelines');

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-mono font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">quiz</span>
            <span>Operations Knowledge Base</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-text)] tracking-tight uppercase font-sans">
            Lagos Logistics FAQ
          </h2>

          <p className="text-sm sm:text-base text-[var(--color-text-muted)] font-sans max-w-2xl mx-auto leading-relaxed">
            Essential operational intel regarding dispatch velocity, H3 coverage clusters, secure escrow verification, and delivery guarantees across Lagos State.
          </p>
        </div>

        {/* SLA Promise Highlight Card */}
        <div className="mb-10 p-5 bg-[var(--color-surface-elevated)] border-l-4 border-l-[var(--color-accent)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">bolt</span>
            </div>
            <div>
              <p className="text-xs font-mono font-black uppercase tracking-wider text-[var(--color-primary)]">
                Our Service Commitment
              </p>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)] font-sans">
                Instant Courier Dispatch Within 15 Minutes Across Lagos
              </h3>
            </div>
          </div>
          <a
            href="tel:+2349014030047"
            className="min-h-[44px] px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">call</span>
            <span>+234 901 403 0047</span>
          </a>
        </div>

        {/* Accordion FAQ List */}
        <div className="space-y-4">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] transition-colors hover:border-[var(--color-border-strong)]"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full min-h-[56px] px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-xl shrink-0 mt-0.5" aria-hidden="true">
                      {faq.icon}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-text-dim)] block mb-0.5">
                        {faq.category}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)] font-sans leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`material-symbols-outlined text-[var(--color-text-dim)] transition-transform duration-200 shrink-0 text-xl ${
                      isOpen ? 'rotate-180 text-[var(--color-primary)]' : ''
                    }`}
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${faq.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[var(--color-text-muted)] font-sans leading-relaxed border-t border-[var(--color-border)]/50 ml-8">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Live Support Banner */}
        <div className="mt-12 p-6 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-bold text-[var(--color-text)] font-sans">
              Have an urgent shipment or custom corporate dispatch route?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] font-sans">
              Operations control tower is online 24/7. Speak directly with a dispatch coordinator.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <a
              href="tel:+2349014030047"
              className="min-h-[44px] px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2 transition-colors cursor-pointer"
              aria-label="Call Dispatch Hotline: +2349014030047"
            >
              <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">call</span>
              <span>+234 901 403 0047</span>
            </a>
            <a
              href="mailto:operations@fastx.ng"
              className="min-h-[44px] px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2 transition-colors cursor-pointer"
              aria-label="Email Dispatch: operations@fastx.ng"
            >
              <span className="material-symbols-outlined text-sm text-[var(--color-primary)]" aria-hidden="true">mail</span>
              <span>operations@fastx.ng</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
