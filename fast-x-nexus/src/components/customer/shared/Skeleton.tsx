'use client';

/**
 * Skeleton — Shimmer Loading Placeholder
 *
 * Variants: text | card | image | map
 * Uses CSS shimmer keyframe from globals.css
 * Source: UI-UX Pro Max UX Guidelines P2 — loading skeletons not spinners
 */

import React from 'react';

type SkeletonVariant = 'text' | 'card' | 'image' | 'map';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const variantDefaults: Record<SkeletonVariant, { width: string; height: string; className: string }> = {
  text: { width: '100%', height: '16px', className: 'rounded-none' },
  card: { width: '100%', height: '120px', className: 'rounded-none' },
  image: { width: '100%', height: '200px', className: 'rounded-none' },
  map: { width: '100%', height: '400px', className: 'rounded-none' },
};

function SkeletonItem({ variant, width, height, className }: Omit<SkeletonProps, 'count'>) {
  const defaults = variantDefaults[variant || 'text'];

  return (
    <div
      className={`
        bg-surface-dim animate-shimmer
        bg-[length:200%_100%]
        bg-[linear-gradient(90deg,var(--color-surface-dim)_0%,var(--color-surface)_50%,var(--color-surface-dim)_100%)]
        ${defaults.className}
        ${className || ''}
      `}
      style={{
        width: width || defaults.width,
        height: height || defaults.height,
      }}
      aria-hidden="true"
    />
  );
}

export function Skeleton({ variant = 'text', width, height, className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} variant={variant} width={width} height={height} className={className} />
      ))}
    </>
  );
}