"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnimatedNode } from "./AnimatedNode";

export const DashboardMockup = () => {
  return (
    <div className="relative z-10 w-full h-full bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl flex flex-col">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center border-b border-white/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-accent)]">analytics</span>
          <span className="text-sm font-semibold">Live Network Flow</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 grid grid-cols-3 gap-3">
        {/* Sidebar metrics */}
        <div className="col-span-1 space-y-3">
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 border-l-4 border-l-[var(--color-primary)]">
            <div className="text-xs text-white/60 mb-1">Active Routes</div>
            <motion.div
              className="text-2xl font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              1,248
            </motion.div>
            <div className="w-full h-1.5 bg-white/10 mt-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--color-accent)] w-3/4 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={{ delay: 1, duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-white/60 mb-1">Throughput</div>
            <motion.div
              className="text-2xl font-bold text-[var(--color-accent)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              94%
            </motion.div>
          </div>
        </div>

        {/* Map area */}
        <div className="col-span-2 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
          {/* Background Map Image */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZDVKIgMgMNID03XnGev1gtTG6eCAxoTyuo-W9oe8KCha9NlJoY8Rzcg1w0RIpXDRscciIi1cPO-Qr0Q9OcBb0NZNOH1c3DLd6ZUn4V3JBxc7GnxQtA2_pm-sYnMap0w-h6bbLM1ObTgrTo4njpIPOMS2xed-Lp5-zfRinL7-35xc_ecCX_y3T-MDlmpMmZegK4TQcBEraaRoT7Hgaxrdp-PaK6UOKhNlHsz2fFZw42_RM7KzwzX7b79pIQdmVDosDsEHzmBLkC4Wl"
            alt="Logistics Network Map"
            className="absolute inset-0 w-full h-full opacity-60 mix-blend-luminosity object-cover"
          />

          {/* Animated Nodes */}
          <AnimatedNode position={{ x: 25, y: 30 }} delay={0.5} />
          <AnimatedNode position={{ x: 70, y: 45 }} delay={1} />
          <AnimatedNode position={{ x: 40, y: 65 }} delay={1.5} />
          <AnimatedNode position={{ x: 85, y: 20 }} delay={2} />

          {/* Central Hub */}
          <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur rounded-full border-2 border-white flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">hub</span>
          </div>
        </div>
      </div>
    </div>
  );
};