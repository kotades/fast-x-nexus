'use client';

/**
 * /src/components/ui/ThreeDimensionalFLogo.tsx
 * Fast X Nexus — 3D Volumetric "F" Emblem & Dynamic Navigation Trigger
 *
 * Renders the iconic Fast X "F" in true volumetric 3D space:
 * - Multi-layer isometric Z-axis extrusion with side depth shading
 * - Ground contact cast shadow for floating elevation
 * - Real <img> layers ensuring 100% guaranteed rendering across all browsers
 * - Interactive 3D hover tilt & responsive tap spin
 */

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ThreeDimensionalFLogoProps {
  onClick?: () => void;
  size?: number; // base pixel size, default 34
  className?: string;
  isOpen?: boolean;
}

export function ThreeDimensionalFLogo({
  onClick,
  size = 34,
  className = '',
  isOpen = false,
}: ThreeDimensionalFLogoProps) {
  const iconSize = Math.round(size * 0.72);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{
        scale: 1.1,
        rotateY: -28,
        rotateX: 20,
      }}
      whileTap={{
        scale: 0.92,
        rotateY: 180,
      }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 20,
      }}
      className={`relative flex items-center justify-center cursor-pointer group focus:outline-none shrink-0 rounded-full bg-gradient-to-b from-white via-slate-50 to-emerald-50/60 border border-emerald-500/35 shadow-[0_3px_10px_rgba(22,101,52,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.95)] transition-shadow duration-300 group-hover:border-emerald-500/60 group-hover:shadow-[0_4px_16px_rgba(22,101,52,0.28)] ${className}`}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
        width: size,
        height: size,
      }}
      aria-label="Toggle navigation menu"
      title="Toggle Navigation Menu"
    >
      {/* Floating Volumetric 3D Emblem Container (Isometrically Posed at Rest) */}
      <div
        className="relative pointer-events-none select-none"
        style={{
          width: iconSize,
          height: iconSize,
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-24deg) rotateX(18deg) rotateZ(-1deg)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Layer 0: Ground Contact Cast Shadow */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(1px) translateY(3.5px) scale(0.88)',
            filter: 'blur(2px) brightness(0)',
            opacity: 0.35,
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt=""
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>

        {/* Layer 1: Darkest Back Extrusion Slice */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(2px)',
            filter: 'brightness(0.2) saturate(1.8)',
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt=""
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>

        {/* Layer 2: Mid-Back Extrusion Slice */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(3.5px)',
            filter: 'brightness(0.35) saturate(1.8)',
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt=""
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>

        {/* Layer 3: Mid Extrusion Slice */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(5px)',
            filter: 'brightness(0.55) saturate(1.6)',
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt=""
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>

        {/* Layer 4: Mid-Front Extrusion Slice */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(6.5px)',
            filter: 'brightness(0.75) saturate(1.4)',
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt=""
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>

        {/* Layer 5: Front Face (Vibrant Emerald with drop shadow) */}
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(8px)',
            filter: 'brightness(1.08) saturate(1.3) drop-shadow(0 2px 3px rgba(5,46,22,0.35))',
          }}
        >
          <Image
            src="/images/fast-x-f-icon.png"
            alt="Fast X Emblem"
            fill
            sizes="30px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Mobile Indicator Dot */}
      <span
        className={`md:hidden absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white transition-all duration-300 ${
          isOpen ? 'bg-emerald-600 scale-110 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-emerald-500'
        }`}
        style={{ transform: 'translateZ(12px)' }}
      />
    </motion.button>
  );
}
