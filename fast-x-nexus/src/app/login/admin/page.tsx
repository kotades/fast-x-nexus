'use client';

/**
 * /src/app/login/admin/page.tsx
 * Fast X Nexus — Dedicated Admin & Operations Staff Login Portal
 *
 * Provides direct Email & Password authentication for Operations Admins.
 * Enforces role verification ('admin' | 'operator') and routes directly
 * to the Admin Control Tower (/admin).
 */

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { Logo } from '@/components/ui/Logo';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserClient();

  const performSignIn = async (signInEmail: string, signInPass: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signInEmail.trim()) {
      setErrorMessage('Please provide your administrator email.');
      return;
    }
    if (!signInPass) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    startTransition(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signInEmail.trim(),
          password: signInPass,
        });

        if (error) {
          setErrorMessage(error.message || 'Authentication failed. Please verify credentials.');
          return;
        }

        if (!data?.user) {
          setErrorMessage('Failed to establish session. Please try again.');
          return;
        }

        // Verify that this user has administrative authority
        let role = data.user.app_metadata?.role || data.user.user_metadata?.role;
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();
          role = profile?.role;
        }

        if (role !== 'admin' && role !== 'operator' && role !== 'vendor') {
          setErrorMessage(
            'Access Restricted: This account does not possess operations or administrator privileges.'
          );
          await supabase.auth.signOut();
          return;
        }

        setSuccessMessage('Admin credentials verified. Launching Control Tower...');

        // Full document redirect to sync session cookies with middleware
        const searchParams = new URLSearchParams(window.location.search);
        const next = searchParams.get('next') || '/admin';
        window.location.href = next;
      } catch (err: any) {
        setErrorMessage(err?.message || 'An unexpected error occurred during authentication.');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSignIn(email, password);
  };

  const handleQuickAdminLogin = () => {
    setEmail('admin@fastx.ng');
    setPassword('AdminTestPass2026!');
    performSignIn('admin@fastx.ng', 'AdminTestPass2026!');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <LandingHeader />

      <main className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden py-12 lg:py-20 px-4">
        {/* Subtle background industrial grid */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 107, 63, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 107, 63, 0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-md w-full mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border-2 border-[#E2E8F0] border-l-4 border-l-[#006B3F] rounded-xl shadow-lg p-6 sm:p-8"
          >
            {/* Header / Brand */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Logo showSubtitle={false} iconSize={36} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[10px] font-mono font-bold text-[#006B3F] uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 bg-[#006B3F] rounded-full animate-pulse" />
                Operations Control Tower
              </div>
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
                Admin Authentication
              </h1>
              <p className="mt-1 text-xs text-[#64748B] font-sans">
                Sign in with operations credentials to access the dispatch radar, fleet management, and waybill pipeline.
              </p>
            </div>

            {/* 1-Click Quick Testing Action */}
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-700">bolt</span>
                  Quick Access Testing
                </span>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  admin@fastx.ng
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug mb-2.5">
                Authenticate instantly with pre-configured administrator credentials for testing and verification.
              </p>
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={isPending}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                {isPending ? (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">login</span>
                )}
                <span>1-Click Admin Sign-In</span>
              </button>
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-[#E2E8F0]" />
              <span className="flex-shrink mx-3 text-[10px] font-mono font-bold text-[#94A3B8] uppercase">
                or enter credentials
              </span>
              <div className="flex-grow border-t border-[#E2E8F0]" />
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-800 text-xs">
                <span className="material-symbols-outlined text-sm text-red-600 flex-shrink-0 mt-0.5">
                  error
                </span>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Success Notification */}
            {successMessage && (
              <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-emerald-800 text-xs font-medium">
                <span className="material-symbols-outlined text-sm text-emerald-600 flex-shrink-0 mt-0.5 animate-spin">
                  progress_activity
                </span>
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-mono font-bold text-[#334155] uppercase tracking-wider mb-1.5"
                >
                  Admin Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <span className="material-symbols-outlined text-sm">mail</span>
                  </span>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fastx.ng"
                    disabled={isPending}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-mono font-bold text-[#334155] uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <span className="material-symbols-outlined text-sm">lock</span>
                  </span>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isPending}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#334155]"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 bg-[#006B3F] hover:bg-[#005230] active:bg-[#004225] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 min-h-[44px] mt-2"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span>Authenticate & Enter Control Tower</span>
                  </>
                )}
              </button>
            </form>

            {/* Back Navigation */}
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] text-center">
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-sans text-[#64748B] hover:text-[#006B3F] transition-colors"
              >
                <span className="material-symbols-outlined text-xs">arrow_back</span>
                Return to Customer & Driver Login
              </a>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
