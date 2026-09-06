'use client';

import React from 'react';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-1 max-w-4xl mx-auto px-6 lg:px-8 py-16 w-full font-sans">
        <div className="mb-10 border-b border-[var(--color-border)] pb-6">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-primary)] mb-2">
            LEGAL ARCHITECTURE
          </p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--color-text)]">
            Terms of Service
          </h1>
          <p className="text-xs text-[var(--color-text-dim)] font-mono mt-2">
            VERSION 2.4 — EFFECTIVE SEPTEMBER 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              1. Logistics Engine & Service SLA
            </h2>
            <p>
              Fast X Nexus provides high-velocity on-demand courier, freight routing, and spatial dispatch services
              operating under our binding commitment: Instant Courier Dispatch Within 15 Minutes Across Lagos.
              All delivery requests are subject to corridor verification and courier availability across active H3 hex clusters.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              2. Dual-PIN Security Verification
            </h2>
            <p>
              To eliminate package tampering and delivery disputes, cargo handoff requires cryptographic Proof of Pickup (POP)
              and Proof of Delivery (POD) PINs. Senders must only disclose the POP PIN once the courier physically receives the parcel.
              Recipients must only disclose the POD PIN upon successful receipt and inspection.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              3. Payment & Escrow Settlement
            </h2>
            <p>
              Payments processed through Paystack are held in digital escrow until proof-of-delivery verification is validated.
              All tariffs and rate matrices are calculated dynamically based on package weight, volume, declared value,
              and geospatial corridor density.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              4. Contact & Disputes
            </h2>
            <p>
              For courier disputes, cargo claims, or corporate service level agreements, contact operations dispatch directly:
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="tel:+2349014030047"
                className="min-h-[44px] px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">call</span>
                <span>+234 901 403 0047</span>
              </a>
              <a
                href="mailto:operations@fastx.ng"
                className="min-h-[44px] px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">mail</span>
                <span>operations@fastx.ng</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
