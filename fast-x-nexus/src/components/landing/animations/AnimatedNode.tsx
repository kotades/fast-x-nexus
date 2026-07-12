'use client';

import { motion } from 'framer-motion';

interface AnimatedNodeProps {
  position: { x: number; y: number };
  delay: number;
}

export const AnimatedNode = ({ position, delay }: AnimatedNodeProps) => {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-full"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        backgroundColor: 'var(--color-accent)',
      }}
      animate={{
        opacity: [0.75, 0.3, 0.75],
        scale: [1, 1.5, 1],
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};