'use client';

/**
 * Badge — Status Indicator with Color Mapping
 *
 * Variants: primary | success | warning | error | neutral
 * Sizes: sm | md
 * Special: dot variant for live status indicators
 */

import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-muted text-primary border-primary-muted',
  success: 'bg-success-bg text-success border-success-bg',
  warning: 'bg-warning-bg text-warning border-warning-bg',
  error: 'bg-error-bg text-error border-error-bg',
  neutral: 'bg-surface-dim text-text-muted border-surface-dim',
};

const dotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-text-dim',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-mono font-bold uppercase tracking-widest
        rounded-none border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
}