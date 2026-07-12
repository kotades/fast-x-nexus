'use client';

/**
 * ConnectionLine — SVG Path Between Nodes
 *
 * Draws a dashed SVG connection line with an animated pulse dot traveling along it.
 * Uses Remotion-inspired spring timing for the pulse animation.
 */

import React from 'react';

interface ConnectionLineProps {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  color?: 'primary' | 'accent';
}

export function ConnectionLine({ x1, y1, x2, y2, color = 'primary' }: ConnectionLineProps) {
  const strokeColor = color === 'primary' ? 'var(--color-primary)' : 'var(--color-accent)';
  const pulseColor = color === 'primary' ? '#fbbc24' : 'var(--color-primary)';

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        fill="none"
        stroke={strokeColor}
        strokeDasharray="4 4"
        strokeWidth="2"
        opacity="0.4"
      />
      <circle
        className="animate-ping"
        cx={x2}
        cy={y2}
        fill={pulseColor}
        opacity="0.2"
        r="6"
      />
    </svg>
  );
}