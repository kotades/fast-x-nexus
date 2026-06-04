/**
 * /src/app/login/page.tsx
 * Fast X Nexus — Login / Authentication Page
 *
 * Design: Industrial Monolith — dark, sharp, high contrast.
 * Mobile-first. No decorative elements. Every pixel earns its place.
 */

import { Metadata } from 'next';
import { PhoneAuthForm } from '@/components/auth/PhoneAuthForm';

export const metadata: Metadata = {
  title: 'Sign In — Fast X Nexus',
  description: 'Access the Fast X Nexus logistics command centre.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0D1117] flex flex-col">

      {/* ── Top accent bar ─────────────────────────────────────────── */}
      <div className="h-[3px] w-full bg-[#22C55E]" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-6 py-5 border-b border-[#1F2937]">
        <span className="text-[#F9FAFB] font-bold text-lg tracking-tight">
          FAST<span className="text-[#22C55E]">X</span>
          <span className="text-[#6B7280] font-normal text-xs ml-2 tracking-widest">NEXUS</span>
        </span>
      </header>

      {/* ── Main layout: centered card ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="bg-[#111827] border border-[#1F2937] border-l-[3px] border-l-[#22C55E] p-8">

            {/* Heading */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-[#22C55E] tracking-widest uppercase mb-2">
                Secure Access
              </p>
              <h1 className="text-2xl font-bold text-[#F9FAFB] leading-tight">
                Enter the Nexus
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Enter your WhatsApp-enabled number to receive a one-time code.
              </p>
            </div>

            {/* Auth Form */}
            <PhoneAuthForm />

          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-[#4B5563]">
            By signing in, you agree to the{' '}
            <a href="/terms" className="text-[#6B7280] hover:text-[#9CA3AF] underline transition-colors">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#6B7280] hover:text-[#9CA3AF] underline transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* ── Bottom status bar ──────────────────────────────────────── */}
      <footer className="px-6 py-4 border-t border-[#1F2937] flex items-center justify-between">
        <span className="text-xs text-[#4B5563]">© 2025 Fast X Nexus Services</span>
        <span className="flex items-center gap-1.5 text-xs text-[#4B5563]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Systems Operational
        </span>
      </footer>

    </main>
  );
}
