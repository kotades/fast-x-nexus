'use client';

/**
 * AvatarSection — Initials-based avatar with hover edit overlay
 *
 * Renders a large circular avatar with the user's initials.
 * Hovering shows a subtle edit action hint.
 * Uses the brand Forest Green as the fill color.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface AvatarSectionProps {
  initials: string;
  name: string;
}

export function AvatarSection({ initials, name }: AvatarSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      className="flex flex-col items-center gap-3 group cursor-pointer"
    >
      <div className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden">
        <span className="text-3xl font-black text-primary-text font-mono select-none">
          {initials}
        </span>
        {/* Hover overlay: subtle camera/edit hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-[var(--duration-200)] flex items-center justify-center">
          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-all duration-[var(--duration-200)]">
            photo_camera
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-[var(--duration-200)]">
        Change Photo
      </span>
    </motion.div>
  );
}