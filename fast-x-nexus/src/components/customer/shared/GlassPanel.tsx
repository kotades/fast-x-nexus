'use client';

/**
 * GlassPanel — Frosted Glass Container
 *
 * Reusable glass-panel wrapper for map control overlays.
 * Uses the .glass-panel CSS class from globals.css.
 */

import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`glass-panel rounded-none shadow-md ${className}`}>
      {children}
    </div>
  );
}