'use client';

import { motion } from 'framer-motion';

interface GlowingOrbProps {
  size: number;
  color: string;
  pulseDuration: number;
  position: { x: number; y: number };
}

export const GlowingOrb = ({ size, color, pulseDuration, position }: GlowingOrbProps) => {
  return (
    <motion.div
      className="absolute rounded-full filter blur-3xl pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: `${position.x}%`,
        top: `${position.y}%`,
        mixBlendMode: 'multiply',
        transform: 'translate(-50%, -50%)',
      }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: pulseDuration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};