'use client';

/**
 * LiveFeedIndicator — Animated Live Feed Badge
 *
 * Green pulse dot + "Live Feed Active" label in glass panel.
 */

import React from 'react';
import { GlassPanel } from './GlassPanel';

interface LiveFeedIndicatorProps {
  className?: string;
}

export function LiveFeedIndicator({ className = '' }: LiveFeedIndicatorProps) {
  return (
    <GlassPanel className={`px-3 py-2 flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
        Live Feed Active
      </span>
    </GlassPanel>
  );
}