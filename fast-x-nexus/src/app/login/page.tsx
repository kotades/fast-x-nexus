'use client';

/**
 * /src/app/login/page.tsx
 * Fast X Nexus — Login / Authentication Page
 *
 * Updated with landing page animation strategy, gradient background,
 * and standard header/footer.
 */

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AuthForm } from '@/components/auth/AuthForm';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';

export default function LoginPage() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />

      <main 
        ref={ref}
        className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)] py-16 lg:py-24"
      >
        {/* Industrial Subgrid Backing */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="max-w-md w-full mx-auto relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="p-8 border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface-elevated)] !text-[var(--color-text)]">
              {/* Heading */}
              <div className="mb-8 text-center">
                <p className="text-xs font-semibold text-[var(--color-primary)] tracking-widest uppercase mb-2">
                  Secure Access
                </p>
                <h1 className="text-3xl font-black text-[var(--color-text)] leading-tight">
                  Enter the Nexus
                </h1>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Secure access via Google, Email, or WhatsApp.
                </p>
              </div>

              {/* Auth Form */}
              <AuthForm />

              {/* Footer note */}
              <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
                By signing in, you agree to the{' '}
                <a href="/terms" className="text-[var(--color-text)] hover:text-[var(--color-primary)] underline transition-colors">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="/privacy" className="text-[var(--color-text)] hover:text-[var(--color-primary)] underline transition-colors">
                  Privacy Policy
                </a>
                .
              </p>
            </GlassCard>
          </motion.div>
        </div>
        
        {/* Diagonal structural element */}
        <div
          className="absolute bottom-0 right-0 z-20 h-16 w-1/3 bg-[var(--color-surface)]"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
        />
      </main>

      <Footer />
    </div>
  );
}
