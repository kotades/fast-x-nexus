'use client';

/**
 * /src/app/onboarding/page.tsx
 * Fast X Nexus — Onboarding Profile Completion
 *
 * Updated with landing page animation strategy, gradient background,
 * and standard header/footer.
 */

import React, { useState, useTransition, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { motion, useInView } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';

export default function OnboardingPage() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createBrowserClient();
  
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic E.164 validation
    if (!/^\+[1-9]\d{6,14}$/.test(phone.replace(/\s+/g, ''))) {
      setError('Enter a valid phone number in international format, e.g. +2348012345678');
      return;
    }

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please log in again.');
        return;
      }

      // Update the public.profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ whatsapp_contact: phone.replace(/\s+/g, '') })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update Error:', updateError);
        setError('Failed to save contact. Make sure RLS allows profile updates.');
        return;
      }

      // Hard redirect to the root so middleware intercepts and routes to the correct dashboard
      window.location.href = '/';
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />

      <main 
        ref={ref}
        className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)] py-16 lg:py-24"
      >

        <div className="max-w-md w-full mx-auto relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-8 border-l-4 border-l-[var(--color-accent)] bg-[var(--color-surface-elevated)] !text-[var(--color-text)]">
              <div className="mb-8 text-center">
                <span className="material-symbols-outlined text-[var(--color-accent)] text-4xl mb-2" aria-hidden="true">person_add</span>
                <h1 className="text-2xl font-black text-[var(--color-text)] tracking-tight mb-2">
                  Complete Your Profile
                </h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                  We need your WhatsApp number to send you critical updates about your bookings and shipments.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 tracking-widest uppercase">
                    WhatsApp Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-dim)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    disabled={isPending}
                    required
                  />
                  {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[var(--color-primary)] text-white font-bold text-sm py-3 px-6 hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 mt-2"
                >
                  {isPending ? 'SAVING...' : 'SAVE & CONTINUE →'}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        </div>
        
        {/* Diagonal structural element */}
        <div
          className="absolute bottom-0 left-0 z-20 h-16 w-1/3 bg-[var(--color-surface)]"
          style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
        />
      </main>

      <Footer />
    </div>
  );
}
