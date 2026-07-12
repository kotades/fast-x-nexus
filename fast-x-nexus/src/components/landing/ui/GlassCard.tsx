"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard = ({ children, className = "" }: GlassCardProps) => {
  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg ${className}`}
      whileHover={{ scale: 1.01, boxShadow: "0 8px 16px rgba(0,0,0,0.2)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
};
