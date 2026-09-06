'use client';

/**
 * /src/app/onboarding/rider/page.tsx
 * Fast X Nexus — Enterprise Rider Onboarding Portal
 *
 * Fully styled with Fast X Design Token System:
 * - Forest Green primary (#347227) & Gold accent (#facc15)
 * - Slate canvas & Crisp White elevated surfaces
 * - Sharp Swiss industrial aesthetic with high contrast
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { GlassCard } from '@/components/landing/ui/GlassCard';
import { registerRiderAction } from '@/app/actions/riderRegistration';

const coverageZones = [
  { id: 'ikorodu', name: 'Ikorodu Division Hub', sub: 'Oreyo, Igbogbo, Agric, Benson, Majidun, Laspotech' },
  { id: 'mainland', name: 'Lagos Mainland Corridor', sub: 'Ikeja GRA, Yaba, Surulere, Oshodi, Agege, Alausa' },
  { id: 'island', name: 'Lagos Island & Lekki Zone', sub: 'Victoria Island, Ikoyi, Lekki Phase 1, Ajah, Chevron' },
  { id: 'delta', name: 'Delta State Logistics Hub', sub: 'Effurun, Warri Central, Ugbolokposo, PTI, Uvwie' },
  { id: 'abuja', name: 'Abuja Federal Capital Hub', sub: 'Central Business District, Wuse 2, Maitama, Garki' },
];

export default function RiderOnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'van' | 'car'>('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [coverageZone, setCoverageZone] = useState('ikorodu');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');

  const supabase = createBrowserClient();

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        if (user.email) setEmail(user.email);
        if (user.phone) setWhatsappPhone(user.phone);
        if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
      }
    }
    checkSession();
  }, [supabase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await registerRiderAction({
        fullName,
        email: user ? undefined : email,
        password: user ? undefined : password,
        whatsappPhone,
        vehicleType,
        vehiclePlate,
        coverageZone,
        driverLicenseNumber,
      });

      if (res.success) {
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.error || 'Failed to activate rider account. Please try again.');
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      <LandingHeader />

      <main className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)] py-12 lg:py-20 px-4">

        <div className="max-w-2xl w-full mx-auto relative z-10">
          <GlassCard className="p-6 md:p-8 border-l-4 border-l-[var(--color-primary)] bg-[var(--color-surface-elevated)] !text-[var(--color-text)] shadow-2xl font-mono">
            {/* Header */}
            <div className="border-b border-[var(--color-border)] pb-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-primary)]">
                  FAST X FLEET NETWORK
                </span>
                <span className="px-2.5 py-0.5 bg-[var(--color-forest-50)] border border-[var(--color-primary-muted)] text-[var(--color-primary)] text-[10px] font-black uppercase">
                  Step {step} of 3
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text)] uppercase tracking-tight mt-1">
                Rider Onboarding Portal
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                Join our decentralized logistics grid & earn 70% direct commission on every completed dropoff.
              </p>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full h-1.5 bg-[var(--color-slate-100)] border border-[var(--color-border)] mb-6 overflow-hidden">
              <motion.div
                className="h-full bg-[var(--color-primary)]"
                initial={{ width: '33%' }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-l-red-500 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {/* ══════════════════════════════════════════════════════════
                    STEP 1: Account Credentials & Personal Contact
                    ══════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="border-b border-[var(--color-border)] pb-2">
                      <h2 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest">
                        1. Driver Identity & Authentication
                      </h2>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Enter your legal identity and WhatsApp contact for real-time order dispatch notifications.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                          Full Legal Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Babatunde Adeleke"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                        />
                      </div>

                      {!user && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="courier@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                              Create Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="Min. 6 characters"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                          WhatsApp Phone Number (E.164)
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+234 801 234 5678"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value)}
                          className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                        />
                        <p className="text-[9px] text-[var(--color-text-dim)] mt-1">
                          We will dispatch delivery PIN codes and order waybills to this WhatsApp line.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={!fullName || (!user && (!email || password.length < 6)) || !whatsappPhone}
                        onClick={() => setStep(2)}
                        className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer shadow-md"
                      >
                        Next: Vehicle Specs →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    STEP 2: Vehicle & Fleet Logistics
                    ══════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="border-b border-[var(--color-border)] pb-2">
                      <h2 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest">
                        2. Fleet & Transport Mode
                      </h2>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Select your vehicle type to optimize cargo weight limits and routing telemetry.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'motorcycle', label: 'Motorcycle (Okada)', icon: 'two_wheeler', desc: 'Up to 25kg' },
                        { id: 'bicycle', label: 'Bicycle / E-Bike', icon: 'pedal_bike', desc: 'Up to 8kg' },
                        { id: 'car', label: 'Sedan / Hatchback', icon: 'directions_car', desc: 'Up to 100kg' },
                        { id: 'van', label: 'Delivery Van', icon: 'local_shipping', desc: 'Up to 500kg' },
                      ].map((v) => (
                        <button
                          type="button"
                          key={v.id}
                          onClick={() => setVehicleType(v.id as any)}
                          className={`p-3.5 border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                            vehicleType === v.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-forest-50)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                              : 'border-[var(--color-border)] bg-white hover:border-[var(--color-forest-300)] text-[var(--color-text)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">{v.icon}</span>
                          <span className="text-xs font-bold uppercase">{v.label}</span>
                          <span className="text-[9px] text-[var(--color-text-dim)]">{v.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                          Vehicle Plate Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. KRD-842-XY (or N/A)"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] uppercase transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                          NIN or Driver License Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. NIN-92817264810"
                          value={driverLicenseNumber}
                          onChange={(e) => setDriverLicenseNumber(e.target.value)}
                          className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text)] px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] uppercase transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-slate-50)] text-[var(--color-text)] hover:bg-[var(--color-slate-100)] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        Next: Operating Hub →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    STEP 3: Operating Coverage Zone & Instant Activation
                    ══════════════════════════════════════════════════════════ */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="border-b border-[var(--color-border)] pb-2">
                      <h2 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest">
                        3. Primary Coverage District
                      </h2>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Select your home hub to receive instant H3 radius spatial dispatch pings.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {coverageZones.map((z) => (
                        <label
                          key={z.id}
                          className={`p-3 border flex items-start gap-3 cursor-pointer transition-colors ${
                            coverageZone === z.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-forest-50)] ring-1 ring-[var(--color-primary)]'
                              : 'border-[var(--color-border)] bg-white hover:border-[var(--color-forest-300)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="coverageZone"
                            checked={coverageZone === z.id}
                            onChange={() => setCoverageZone(z.id)}
                            className="mt-1 accent-[var(--color-primary)]"
                          />
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text)] uppercase">{z.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{z.sub}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Agreement Box */}
                    <div className="p-3.5 bg-[var(--color-slate-50)] border border-[var(--color-border)] text-[11px] space-y-1.5 text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1.5 text-[var(--color-forest-600)] font-bold uppercase text-xs">
                        <span className="material-symbols-outlined text-sm">payments</span>
                        70% Direct Payout & Proof-of-Delivery Protocol
                      </div>
                      <p>
                        By activating your courier account, you agree to fulfill accepted orders promptly and verify the recipient's 4-digit Proof-of-Delivery PIN to trigger automated escrow settlement.
                      </p>
                    </div>

                    <div className="pt-3 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-slate-50)] text-[var(--color-text)] hover:bg-[var(--color-slate-100)] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-mono font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                      >
                        {isPending ? 'ACTIVATING COURIER...' : 'ACTIVATE RIDER PROFILE →'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </GlassCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}
