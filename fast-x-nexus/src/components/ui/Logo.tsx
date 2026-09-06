'use client';

/**
 * Logo — Brand logo renderer
 *
 * Configured to dynamically fill its parent container using Next.js "fill" layout.
 * Supports fallback dimensions (w-48, h-12) for backwards compatibility.
 */

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: string;
  height?: string;
  // Fallbacks for compatibility
  showSubtitle?: boolean;
  iconSize?: number;
}

export function Logo({ 
  className = '',
  width = 'w-48',
  height = 'h-12',
  showSubtitle,
  iconSize
}: LogoProps) {
  return (
    <div 
      className={`relative inline-block ${width} ${height} ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <Image
        src="/images/logo.png"
        alt="Fast X Nexus"
        fill
        sizes="(max-width: 768px) 150px, 200px"
        className="object-contain object-left pointer-events-none"
        priority
      />
    </div>
  );
}