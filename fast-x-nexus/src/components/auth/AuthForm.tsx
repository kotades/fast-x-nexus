'use client';

/**
 * /src/components/auth/AuthForm.tsx
 * Fast X Nexus — Expanded Multi-Provider Authentication
 *
 * Supports:
 * - Google OAuth
 * - Email Magic Links
 * - Phone OTP
 */

import { useState, useTransition } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modals/Modal';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

type AuthMethod = 'phone' | 'email';
type PhoneStep = 'phone' | 'otp';

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

function AuthFormInner() {
  const router = useRouter();
  
  // State
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isErrorModalOpen = errorMessage !== null;
  
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserClient();

  // ── 1. Google OAuth (Client Side ID Token) ─────────────────────────────────
  async function handleGoogleSuccess(credentialResponse: any) {
    setErrorMessage(null);
    if (!credentialResponse.credential) {
      setErrorMessage('Google authentication failed. No ID token received.');
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Check for intended destination or default to home/hub
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') || '/';
      window.location.href = next;
    });
  }

  // ── 2. Email Magic Link ────────────────────────────────────────────────────
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') || '/';
      const redirectUrl = new URL('/auth/callback', window.location.origin);
      redirectUrl.searchParams.set('next', next);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Magic link sent! Check your inbox.');
      }
    });
  }

  // ── 3. Phone OTP ───────────────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidE164(phone)) {
      setErrorMessage('Enter a valid phone number in international format, e.g. +2348012345678');
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        phone
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setPhoneStep('otp');
    });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setErrorMessage('Enter the 6-digit code sent to your phone.');
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms', // Note: even if sent via WhatsApp, type is sms
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') || '/';
      window.location.href = next;
    });
  }

  function closeErrorModal() {
    setErrorMessage(null);
  }

  // ── Shared UI Styles ───────────────────────────────────────────────────────
  const inputClass =
    'w-full bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted/70 ' +
    'px-4 py-3 text-sm focus:outline-none focus:border-brand-green transition-colors duration-150';

  const btnClass =
    'w-full bg-brand-green text-white font-bold text-sm py-3 px-6 ' +
    'hover:bg-[#285b1e] active:bg-[#1f4517] transition-colors duration-150 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  const googleBtnClass =
    'w-full bg-white text-gray-800 border border-gray-300 font-bold text-sm py-3 px-6 flex items-center justify-center gap-3 ' +
    'hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 disabled:opacity-40 shadow-sm';

  const tabClass = (active: boolean) =>
    `flex-1 pb-2.5 text-center text-[10px] font-black uppercase tracking-widest border-b-2 transition-all duration-300 font-mono ${
      active ? 'border-brand-green text-brand-text' : 'border-transparent text-brand-muted hover:text-brand-text'
    }`;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* ── TOP: Google OAuth ── */}
      <div className="flex justify-center w-full overflow-hidden rounded">
        {isPending ? (
          <div className="text-sm font-bold text-brand-muted p-3">AUTHENTICATING...</div>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMessage('Google authentication failed. Please try again.')}
            width="340"
            theme="outline"
            size="large"
          />
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div className="flex items-center gap-3">
        <div className="h-px bg-brand-border flex-1"></div>
        <span className="text-xs font-semibold text-brand-muted uppercase tracking-widest">OR</span>
        <div className="h-px bg-brand-border flex-1"></div>
      </div>

      {/* ── TABS ── */}
      {phoneStep === 'phone' && (
        <div className="flex">
          <button type="button" onClick={() => { setMethod('phone'); setSuccessMessage(null); }} className={tabClass(method === 'phone')} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>Phone OTP</button>
          <button type="button" onClick={() => { setMethod('email'); setSuccessMessage(null); }} className={tabClass(method === 'email')} style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>Magic Link</button>
        </div>
      )}

      {/* ── BOTTOM: Form ── */}
      {method === 'phone' && phoneStep === 'phone' && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-brand-muted mb-2 tracking-widest uppercase">
              WhatsApp Number
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
            <p className="mt-1.5 text-xs text-brand-muted/80">Include your country code — e.g. +44, +1, +234</p>
          </div>
          <button type="submit" disabled={isPending} className={btnClass}>
            {isPending ? 'SENDING CODE…' : 'SEND VERIFICATION CODE →'}
          </button>
        </form>
      )}

      {method === 'phone' && phoneStep === 'otp' && (
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
          <button type="submit" disabled={isPending} className={btnClass}>
            {isPending ? 'VERIFYING…' : 'VERIFY & ENTER NEXUS →'}
          </button>
          <button
            type="button"
            onClick={() => { setPhoneStep('phone'); setOtp(''); setErrorMessage(null); }}
            className="text-xs text-brand-muted hover:text-brand-green transition-colors text-center"
          >
            ← Change number
          </button>
        </form>
      )}

      {method === 'email' && (
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-brand-muted mb-2 tracking-widest uppercase">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="operator@fastxnexus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              disabled={isPending}
              required
            />
          </div>
          {successMessage ? (
            <div className="bg-green-50 border border-brand-green text-brand-green text-sm p-4 text-center">
              {successMessage}
            </div>
          ) : (
            <button type="submit" disabled={isPending} className={btnClass}>
              {isPending ? 'SENDING LINK…' : 'SEND MAGIC LINK →'}
            </button>
          )}
        </form>
      )}

      {/* Error Modal */}
      <Modal
        isOpen={isErrorModalOpen}
        onClose={closeErrorModal}
        title="Authentication Error"
        description={errorMessage || 'An unknown error occurred.'}
        primaryActionLabel="Try Again"
        onPrimaryAction={closeErrorModal}
        roles={['guest']} // Render only if guest
      />
    </div>
  );
}

export function AuthForm() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return <div className="text-red-500 font-bold text-sm">Missing Google Client ID configuration.</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthFormInner />
    </GoogleOAuthProvider>
  );
}
