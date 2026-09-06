'use client';

/**
 * /src/components/rider/JobPool/JobPool.tsx
 * Fast X Nexus — Enterprise Rider Job Pool
 *
 * Pulls live unassigned orders from Supabase, displays H3 distance,
 * payout calculation, and atomic job claiming actions.
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion } from 'framer-motion';
import { getAvailableJobs, claimJob } from '@/app/actions/rider';
import { useRiderDashboard } from '@/components/rider/contexts/RiderDashboardContext';
import { Skeleton } from '@/components/customer/shared/Skeleton';

export function JobPool() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { navigateTo } = useRiderDashboard();

  const fetchJobs = async () => {
    if (claimingId) return;
    try {
      const res = await getAvailableJobs();
      if (res && res.success && Array.isArray(res.data)) {
        setJobs(res.data);
      }
    } catch (err: any) {
      // Graceful offline/network-reconnect handling
      console.warn('[JobPool] Sync paused:', err?.message || 'Network unreachable');
    } finally {
      setInitialLoaded(true);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [claimingId]);

  const handleClaimJob = async (jobId: string) => {
    setClaimingId(jobId);
    setFeedback(null);

    const targetJob = jobs.find((j) => j.id === jobId);
    // Optimistically remove from visible list for instant response
    setJobs((prev) => prev.filter((j) => j.id !== jobId));

    try {
      const res = await claimJob(jobId);
      if (res.success) {
        navigateTo('route_map');
      } else {
        // Rollback on failure
        if (targetJob) {
          setJobs((prev) => [targetJob, ...prev]);
        }
        setFeedback(`❌ ${res.error}`);
        setClaimingId(null);
      }
    } catch (err: any) {
      if (targetJob) {
        setJobs((prev) => [targetJob, ...prev]);
      }
      setFeedback(`❌ ${err.message || 'Failed to claim job'}`);
      setClaimingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
            DISPATCH / JOB POOL
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-text">
            Available Jobs
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {jobs.length} unassigned waybills in your coverage zone
          </p>
        </div>

        <button
          onClick={() => fetchJobs()}
          className="px-3 py-1.5 bg-surface border border-border text-xs font-bold text-text-muted hover:text-text uppercase flex items-center gap-1.5 transition-colors self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-xs">refresh</span>
          Refresh Pool
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-surface-elevated border-l-4 border-l-primary border border-border text-xs text-text">
          {feedback}
        </div>
      )}

      {/* Job Cards List */}
      <div className="space-y-3">
        {!initialLoaded ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-surface-elevated border border-border p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-surface-elevated border border-dashed border-border p-12 text-center text-text-muted space-y-2">
            <span className="material-symbols-outlined text-3xl text-text-dim">inventory_2</span>
            <p className="text-sm font-bold uppercase tracking-wider">Pool is currently empty</p>
            <p className="text-xs">All incoming orders have been dispatched or assigned.</p>
          </div>
        ) : (
          jobs.map((job, index) => {
            const riderPayout = Math.round((Number(job.total_amount) || 0) * 0.7);
            const parcel = job.parcels?.[0];

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="bg-surface-elevated border border-border border-l-4 border-l-primary p-4 md:p-5 hover:border-text-dim transition-colors"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 w-full min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase">
                        FX-{job.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-dim text-[10px] uppercase block">Pickup</span>
                        <p className="text-text font-bold truncate">{job.pickup_address || 'Lagos Central Hub'}</p>
                      </div>
                      <div>
                        <span className="text-text-dim text-[10px] uppercase block">Dropoff</span>
                        <p className="text-text font-bold truncate">{job.dropoff_address || 'Ikeja Distribution Point'}</p>
                      </div>
                    </div>

                    {parcel && (
                      <div className="flex items-center gap-4 text-[11px] text-text-muted pt-1 border-t border-border">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary" aria-hidden="true">inventory_2</span>
                          <span>{parcel.weight || 'Standard'} kg</span>
                        </span>
                        {parcel.description && <span className="truncate">"{parcel.description}"</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-text-dim uppercase block">Payout</span>
                      <span className="text-lg font-black text-primary">₦{riderPayout.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => handleClaimJob(job.id)}
                      disabled={claimingId === job.id}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {claimingId === job.id ? (
                        <>
                          <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                          Claiming...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">touch_app</span>
                          Claim Job
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}