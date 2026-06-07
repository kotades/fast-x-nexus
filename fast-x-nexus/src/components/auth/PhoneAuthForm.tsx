'use client';

/**
 * /src/components/auth/PhoneAuthForm.tsx
 * Fast X Nexus — Passwordless Phone Auth (Two-Step OTP Flow)
 *
 * Step 1: User enters E.164 phone number → triggers signInWithOtp
 * Step 2: User enters 6-digit OTP → triggers verifyOtp
 * On success: router.push() hands control to middleware for role-based routing
 */

import { useState, useTransition } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp';

// Minimal E.164 validator — must start with +, then digits only
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export function PhoneAuthForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Step 1: Request OTP ────────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidE164(phone)) {
      setError('Enter a valid phone number in international format, e.g. +2348012345678');
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: 'sms' },
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setStep('otp');
    });
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      // Middleware will intercept and redirect based on role
      router.refresh();
    });
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputClass =
    'w-full bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted/70 ' +
    'px-4 py-3 text-sm focus:outline-none focus:border-brand-green transition-colors duration-150';

  const btnClass =
    'w-full bg-brand-green text-white font-bold text-sm py-3 px-6 ' +
    'hover:bg-[#285b1e] active:bg-[#1f4517] transition-colors duration-150 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="w-full">
      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-brand-muted mb-2 tracking-widest uppercase">
              WhatsApp / Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+234 801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              disabled={isPending}
              required
            />
            <p className="mt-1.5 text-xs text-brand-muted/80">
              Include your country code — e.g. +44, +1, +234
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={isPending} className={btnClass}>
            {isPending ? 'SENDING CODE…' : 'SEND VERIFICATION CODE →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <div>
            <label htmlFor="otp" className="block text-xs font-semibold text-brand-muted mb-2 tracking-widest uppercase">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="— — — — — —"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
              disabled={isPending}
              required
            />
            <p className="mt-1.5 text-xs text-brand-muted/80">
              Code sent to <span className="text-brand-text font-semibold">{phone}</span>
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={isPending} className={btnClass}>
            {isPending ? 'VERIFYING…' : 'VERIFY & ENTER NEXUS →'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
            className="text-xs text-brand-muted hover:text-brand-green transition-colors text-center"
          >
            ← Change number
          </button>
        </form>
      )}
    </div>
  );
}

