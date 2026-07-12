'use client';

/**
 * JobPool — Available Delivery Jobs Board
 *
 * Displays available jobs with accept actions, distance badges, and earnings.
 * Uses Framer Motion staggered entry animations.
 * Built from Stitch design: Job_pool.html
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useRiderDashboard } from '@/components/rider/contexts/RiderDashboardContext';
import { Skeleton } from '@/components/customer/shared/Skeleton';

const mockJobs = [
  { id: '1', pickup: 'Ikeja, Lagos', dropoff: 'Victoria Island, Lagos', earnings: 2500, distance: '12.4km', customerName: 'Mr. Adewale' },
  { id: '2', pickup: 'Yaba, Lagos', dropoff: 'Surulere, Lagos', earnings: 1800, distance: '8.2km', customerName: 'Ms. Okafor' },
  { id: '3', pickup: 'Maitama, Abuja', dropoff: 'Wuse, Abuja', earnings: 3200, distance: '15.7km', customerName: 'Dr. Bello' },
  { id: '4', pickup: 'GRA, Port Harcourt', dropoff: 'Rumuokwuta, PH', earnings: 2100, distance: '9.8km', customerName: 'Chief Nwosu' },
  { id: '5', pickup: 'Ilupeju, Lagos', dropoff: 'Lekki Phase 1, Lagos', earnings: 4000, distance: '22.1km', customerName: 'Mrs. Obi' },
];

export function JobPool() {
  const { isLoading, acceptJob } = useRiderDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border-2 border-border p-4 rounded-none">
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-text">Available Jobs</h1>
        <p className="text-sm text-text-muted font-mono mt-1">{mockJobs.length} jobs in your area</p>
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {mockJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 25 }}
            className="bg-white border-2 border-border rounded-none p-4 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                  <span className="text-sm font-bold truncate">{job.pickup}</span>
                  <span className="material-symbols-outlined text-text-dim text-sm">arrow_forward</span>
                  <span className="text-sm font-bold truncate">{job.dropoff}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">straighten</span>
                    {job.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {job.customerName}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black text-primary">₦{job.earnings.toLocaleString()}</p>
                <button
                  onClick={() => acceptJob(job.id)}
                  className="mt-2 px-4 py-1.5 bg-primary text-primary-text text-xs font-bold uppercase tracking-wider border-2 border-border hover:bg-primary/90 transition-colors"
                >
                  Accept
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}