'use client';

import React from 'react';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-1 max-w-4xl mx-auto px-6 lg:px-8 py-16 w-full font-sans">
        <div className="mb-10 border-b border-[var(--color-border)] pb-6">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-primary)] mb-2">
            DATA INTEGRITY & TELEMETRY
          </p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--color-text)]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[var(--color-text-dim)] font-mono mt-2">
            NDPR & GLOBAL PRIVACY COMPLIANT — SEPTEMBER 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              1. Spatial Telemetry & Geolocation
            </h2>
            <p>
              Fast X Nexus collects real-time location data from couriers and shipment endpoints solely for dispatch routing,
              ETA computation, and proof of transit. Geolocation coordinates are abstracted into H3 hexagonal indices
              to protect sender and recipient confidentiality while maintaining sub-second tracking accuracy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              2. Data Protection & Encryption
            </h2>
            <p>
              Customer identity information, phone numbers, waybill records, and authentication tokens are encrypted at rest
              and in transit via TLS 1.3. We never monetize, sell, or disclose personal data to third-party advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--color-text)] uppercase tracking-wider">
              3. Privacy Inquiries & Data Rights
            </h2>
            <p>
              Under the Nigeria Data Protection Act (NDPA), you retain the right to audit, export, or purge your personal data.
              Direct inquiries to the Data Protection Officer:
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <a
                href="mailto:operations@fastx.ng"
                className="min-h-[44px] px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">mail</span>
                <span>operations@fastx.ng</span>
              </a>
              <a
                href="tel:+2349014030047"
                className="min-h-[44px] px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">call</span>
                <span>+234 901 403 0047</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
