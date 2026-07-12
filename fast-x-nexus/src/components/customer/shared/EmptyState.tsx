'use client';

/**
 * EmptyState — Illustration + Message + CTA
 *
 * Used for empty lists, no active shipments, etc.
 * Source: UI-UX Pro Max UX Guidelines P2 — empty states with illustration + CTA
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/customer/ui/Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div className="w-16 h-16 bg-surface-low flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-3xl text-text" aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-text mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-xs mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}