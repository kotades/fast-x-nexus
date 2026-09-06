'use client';

/**
 * /src/app/tracking/page.tsx
 * Fast X Nexus — Public Tracking & Telemetry Dashboard
 *
 * Swiss grid control tower layout displaying verbose logistics pipelines,
 * active waybill tracing logs, and live SVG-based telemetry path animation.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingHeader } from '@/components/Header/LandingHeader';
import { Footer } from '@/components/Footer/Footer';
import { getOrderDetails } from '@/app/actions/order';

// Simulated telemetry database
const TRACKING_DATABASE: Record<string, {
  id: string;
  status: string;
  weight: string;
  declaredValue: number;
  originHub: string;
  destHub: string;
  eta: string;
  coordinates: { lat: number; lng: number }[];
  h3Cells: string[];
  checkpoints: { time: string; location: string; event: string; status: string }[];
}> = {
  'FX-LOGISTICS-7A9': {
    id: 'FX-LOGISTICS-7A9',
    status: 'PICKED_UP',
    weight: '12.4kg',
    declaredValue: 120000,
    originHub: 'Lagos Port Hub (H3: 871f1d4a0ffffff)',
    destHub: 'Abuja Central Terminal (H3: 871f1d120ffffff)',
    eta: '3 hrs 15 mins',
    coordinates: [
      { lat: 6.5244, lng: 3.3792 },
      { lat: 7.3775, lng: 3.9470 },
      { lat: 9.0765, lng: 7.3986 }
    ],
    h3Cells: ['871f1d4a0ffffff', '871f1d4b6ffffff', '871f1d120ffffff'],
    checkpoints: [
      { time: '10:45 AM', location: 'Lagos Hub Alpha', event: 'Waybill generated and payment confirmed.', status: 'PLACED' },
      { time: '11:15 AM', location: 'Lagos Hub Alpha', event: 'Order queued in dispatch queue #4.', status: 'PAID_UNASSIGNED' },
      { time: '12:00 PM', location: 'Lagos Sector 3', event: 'Assigned to Rider #44 (Telemetry active).', status: 'ASSIGNED' },
      { time: '01:30 PM', location: 'Shagamu Interchange', event: 'Cargo picked up and transit velocity locked at 84km/h.', status: 'PICKED_UP' },
    ]
  }
};

export default function TrackingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [foundRecord, setFoundRecord] = useState<typeof TRACKING_DATABASE[string] | null>(null);
  const [searched, setSearched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') || params.get('search');
      if (code) {
        setSearchQuery(code);
        setIsScanning(true);
        getOrderDetails(code)
          .then((res) => {
            if (res.success && res.data) {
              router.push(`/customer/orders/${res.data.id}`);
            }
          })
          .catch(() => {})
          .finally(() => setIsScanning(false));
      }
    }
  }, [router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const query = searchQuery.trim().toUpperCase();
    if (TRACKING_DATABASE[query]) {
      setFoundRecord(TRACKING_DATABASE[query]);
      return;
    }

    try {
      setIsScanning(true);
      const res = await getOrderDetails(query);
      if (res.success && res.data) {
        router.push(`/customer/orders/${res.data.id}`);
        return;
      }
    } catch {} finally {
      setIsScanning(false);
    }

    setFoundRecord(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <LandingHeader />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Search & Status Indicators */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6 border-l-[3px] border-l-[var(--color-primary)]">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-[var(--color-text-dim)] mb-2">
              Logistics Terminal / Waybill Tracing
            </p>
            <h1 className="text-xl font-black uppercase tracking-tight mb-4">Search Telemetry</h1>
            
            <form onSubmit={handleSearch} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-black uppercase tracking-wider text-[var(--color-text-dim)] mb-1 block">
                  Waybill Serial Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FX-LOGISTICS-7A9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2.5 text-xs text-[var(--color-text)] outline-none rounded-none focus:border-[var(--color-primary)] font-mono uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={isScanning}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white py-2.5 font-mono text-xs font-black uppercase tracking-widest transition-colors duration-200 cursor-pointer rounded-none flex items-center justify-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Scanning Database...</span>
                  </>
                ) : (
                  <span>Scan Database</span>
                )}
              </button>
            </form>
          </div>

          {/* System Telemetry Status Board */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
              Active Network Telemetry
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Active Telemetry Nodes', value: '41 nodes online' },
                { label: 'H3 Hexagonal Indexing', value: 'Resolution 7 Active' },
                { label: 'Regional Gateways', value: 'Lagos / Abuja / Port-Harcourt' },
                { label: 'Latency SLA', value: '1.2s average ping' }
              ].map((item) => (
                <div key={item.label} className="border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                  <p className="text-[10px] font-mono font-bold uppercase text-[var(--color-text-dim)]">{item.label}</p>
                  <p className="text-xs font-black font-sans">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right Column: Interactive Route Map and Pipeline Logs */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {!searched ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-8 text-center"
              >
                {/* SVG Telemetry Routing Pulse Animation (Remotion-Inspired) */}
                <div className="w-full h-64 flex items-center justify-center relative mb-6">
                  <svg className="w-full h-full max-w-md" viewBox="0 0 400 200">
                    {/* Grid nodes */}
                    <circle cx="50" cy="150" r="4" fill="var(--color-text-dim)" opacity="0.3" />
                    <circle cx="200" cy="50" r="4" fill="var(--color-text-dim)" opacity="0.3" />
                    <circle cx="350" cy="120" r="4" fill="var(--color-text-dim)" opacity="0.3" />
                    
                    {/* Connecting line */}
                    <motion.path
                      d="M 50 150 Q 200 50 350 120"
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      initial={{ strokeDashoffset: 100 }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={{ duration: 10, ease: 'linear', repeat: Infinity }}
                    />

                    {/* Active routing pulsar */}
                    <motion.circle
                      cx="50"
                      cy="150"
                      r="6"
                      fill="var(--color-primary)"
                      animate={{
                        cx: [50, 200, 350],
                        cy: [150, 50, 120]
                      }}
                      transition={{
                        duration: 4,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'reverse'
                      }}
                    />

                    <circle cx="50" cy="150" r="10" fill="none" stroke="var(--color-primary)" strokeWidth="1" className="animate-ping" style={{ transformOrigin: '50px 150px' }} />
                  </svg>
                </div>
                <h2 className="text-base font-black uppercase tracking-wider font-mono">Terminal Standby</h2>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mt-2">
                  Enter an enterprise waybill code on the left terminal console to stream real-time logistics telemetry.
                </p>
              </motion.div>
            ) : foundRecord ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {/* Visual Route Path Map (Animated) */}
                <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
                    Visual Routing Telemetry
                  </h3>
                  
                  <div className="w-full h-48 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
                    {/* SVG Map telemetry routing */}
                    <svg className="w-full h-full" viewBox="0 0 600 200">
                      {/* Grid Lines */}
                      <path d="M 0 50 L 600 50 M 0 100 L 600 100 M 0 150 L 600 150 M 100 0 L 100 200 M 200 0 L 200 200 M 300 0 L 300 200 M 400 0 L 400 200 M 500 0 L 500 200" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3" />
                      
                      {/* Connection Route */}
                      <motion.path
                        d="M 100 130 L 300 80 L 500 120"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                      
                      {/* Origin Hub */}
                      <circle cx="100" cy="130" r="8" fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="3" />
                      <text x="100" y="155" fill="var(--color-text-muted)" fontSize="9" fontFamily="monospace" textAnchor="middle">LAGOS HUB</text>
                      
                      {/* Current Telemetry Position */}
                      <motion.g
                        initial={{ x: 100, y: 130 }}
                        animate={{ x: 300, y: 80 }}
                        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
                      >
                        <circle cx="0" cy="0" r="8" fill="var(--color-primary)" />
                        <circle cx="0" cy="0" r="16" fill="none" stroke="var(--color-primary)" strokeWidth="1" className="animate-ping" />
                      </motion.g>
                      
                      {/* Destination Hub */}
                      <circle cx="500" cy="120" r="8" fill="var(--color-surface)" stroke="var(--color-text)" strokeWidth="3" />
                      <text x="500" y="145" fill="var(--color-text-muted)" fontSize="9" fontFamily="monospace" textAnchor="middle">ABUJA HUB</text>
                    </svg>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Origin Hub', value: foundRecord.originHub.split(' (')[0] },
                    { label: 'Destination Hub', value: foundRecord.destHub.split(' (')[0] },
                    { label: 'Telemetry ETA', value: foundRecord.eta }
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-4">
                      <p className="text-[9px] font-mono font-black uppercase text-[var(--color-text-dim)]">{stat.label}</p>
                      <p className="text-xs font-black uppercase mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tracking Pipeline checkpoints */}
                <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-6">
                    Waybill Pipeline Checkpoints
                  </h3>
                  <div className="relative border-l border-[var(--color-border)] ml-3 pl-6 space-y-6">
                    {foundRecord.checkpoints.map((checkpoint, index) => (
                      <div key={index} className="relative">
                        {/* Bullet point indicator */}
                        <div className={`absolute -left-[30px] top-0 w-3 h-3 border-2 border-[var(--color-surface-elevated)] rounded-none ${
                          index === foundRecord.checkpoints.length - 1 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-text-dim)]'
                        }`} />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-text-muted)] mr-2">
                              {checkpoint.time}
                            </span>
                            <span className="text-xs font-black font-sans uppercase tracking-tight text-[var(--color-text)]">
                              {checkpoint.location}
                            </span>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{checkpoint.event}</p>
                          </div>
                          <span className={`self-start md:self-center text-[9px] font-mono font-bold px-2 py-0.5 border ${
                            checkpoint.status === 'PICKED_UP' 
                              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-muted)]/20'
                              : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]'
                          }`}>
                            {checkpoint.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spatial Indexing details */}
                <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] font-mono mb-4">
                    Spatial Indexing Metadata (H3 Resolution 7)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[10px]">
                    {foundRecord.h3Cells.map((cell, idx) => (
                      <div key={cell} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3 flex justify-between items-center">
                        <span className="text-[var(--color-text-dim)]">INDEX #{idx + 1}</span>
                        <span className="font-bold text-[var(--color-primary)]">{cell}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] p-12 text-center"
              >
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4" aria-hidden="true">database_off</span>
                <h2 className="text-base font-black uppercase tracking-wider font-mono text-red-500">Waybill Code Not Found</h2>
                <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto mt-2">
                  No telemetry stream matches serial code <strong className="text-[var(--color-text)] font-mono">"{searchQuery.toUpperCase()}"</strong>. Ensure correct prefix and try again.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
