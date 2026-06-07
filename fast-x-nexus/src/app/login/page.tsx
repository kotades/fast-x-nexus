/**
 * /src/app/login/page.tsx
 * Fast X Nexus — Login / Authentication Page (Light Theme)
 *
 * Design: Light Industrial Monolith — light background, sharp borders, high contrast.
 * Mobile-first. Every pixel earns its place.
 */

import { Metadata } from 'next';
import { PhoneAuthForm } from '@/components/auth/PhoneAuthForm';

export const metadata: Metadata = {
  title: 'Sign In — Fast X Nexus',
  description: 'Access the Fast X Nexus logistics command centre.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-brand-surface flex flex-col">

      {/* ── Top accent bar ─────────────────────────────────────────── */}
      <div className="h-[3px] w-full bg-brand-green" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-6 py-5 border-b border-brand-border bg-brand-bg">
        <span className="text-brand-text font-bold text-lg tracking-tight flex items-center gap-1.5">
          <span>FAST<span className="text-brand-green">X</span></span>
          <span className="text-brand-text font-bold text-lg">N<span className="text-brand-gold">E</span>XUS</span>
          <span className="text-brand-muted font-normal text-xs ml-2 tracking-widest uppercase">Services</span>
        </span>
      </header>

      {/* ── Main layout: centered card ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="bg-brand-bg border border-brand-border border-l-[3px] border-l-brand-green p-8 shadow-sm">

            {/* Heading */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-brand-green tracking-widest uppercase mb-2">
                Secure Access
              </p>
              <h1 className="text-2xl font-bold text-brand-text leading-tight">
                Enter the Nexus
              </h1>
              <p className="mt-2 text-sm text-brand-muted">
                Enter your WhatsApp-enabled number to receive a one-time code.
              </p>
            </div>

            {/* Auth Form */}
            <PhoneAuthForm />

          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-brand-muted">
            By signing in, you agree to the{' '}
            <a href="/terms" className="text-brand-text hover:text-brand-green underline transition-colors">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-brand-text hover:text-brand-green underline transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* ── Bottom status bar ──────────────────────────────────────── */}
      <footer className="px-6 py-4 border-t border-brand-border bg-brand-bg flex items-center justify-between">
        <span className="text-xs text-brand-muted">© 2025 Fast X Nexus Services</span>
        <span className="flex items-center gap-1.5 text-xs text-brand-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          Systems Operational
        </span>
      </footer>

    </main>
  );
}
