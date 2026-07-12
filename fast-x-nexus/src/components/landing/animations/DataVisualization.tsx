"use client";

import React from "react";
import { motion } from "framer-motion";

interface DataVisualizationProps {
  data: number[];
  isInView: boolean;
}

export const DataVisualization = ({ data, isInView }: DataVisualizationProps) => {
  return (
    <div className="h-24 w-full flex items-end gap-1.5">
      {data.map((value, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={isInView ? { height: `${value}%` } : {}}
          transition={{ delay: i * 0.08, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          className="flex-1 bg-[var(--color-primary-muted)] rounded-t relative"
        >
          {value >= 60 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-[var(--color-surface-elevated)] text-[var(--color-text)] text-[10px] px-1 border border-[var(--color-border)] rounded">
              Peak
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
