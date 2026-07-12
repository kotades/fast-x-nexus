'use client';

/**
 * MapNode — Abstract Hub Node with Spring Pin-Drop
 *
 * Represents a logistics hub on the command map.
 * Animated spring pin-drop on mount with Framer Motion.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface MapNodeProps {
  label: string;
  top: string;
  left: string;
  color?: 'primary' | 'accent';
  type?: 'hub' | 'transit';
}

export function MapNode({ label, top, left, color = 'primary', type = 'hub' }: MapNodeProps) {
  const dotColor = color === 'primary' ? 'bg-primary' : 'bg-accent';
  const dotBorder = color === 'primary' ? 'border-white' : 'border-white';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      }}
      className="absolute flex flex-col items-center group cursor-pointer pointer-events-auto"
      style={{ top, left }}
    >
      {/* Animated Dot */}
      <motion.div
        className={`w-4 h-4 ${dotColor} border-2 ${dotBorder} shadow-md z-10`}
        style={{ borderRadius: '0' }}
        whileHover={{ scale: 1.5 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200 }}
      />

      {/* Connection stem */}
      {type === 'hub' && (
        <div className="h-16 w-0 border-l-2 border-dashed border-border-strong -mt-2" />
      )}

      {/* Tooltip */}
      <div className="bg-surface-elevated border border-border px-2 py-1 text-xs text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 whitespace-nowrap shadow-sm">
        {label}
      </div>
    </motion.div>
  );
}