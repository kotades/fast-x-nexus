"use client";

import React from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function PartnerLogos() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const partners = [
    { name: "JUMIA EXPRESS", type: "icon-text", icon: "local_shipping" },
    { name: "KONGA LOGISTICS", type: "icon-text", icon: "inventory_2" },
    { name: "PAYSTACK COMMERCE", type: "icon-text", icon: "payments" },
    { name: "FLUTTERWAVE FLEET", type: "icon-text", icon: "sync_alt" },
    { name: "ALABA LOGISTICS HUB", type: "icon-text", icon: "hub" },
  ];

  return (
    <section ref={ref} className="bg-[var(--color-surface)] py-8 border-b border-[var(--color-border)]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-sm text-[var(--color-text-muted)] mb-4 uppercase tracking-widest font-medium"
        >
          Trusted by industry leaders
        </motion.p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-lg text-[var(--color-text)] flex items-center gap-1"
            >
              {partner.type === "icon-text" && (
                <span className="material-symbols-outlined">{partner.icon}</span>
              )}
              <span>{partner.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
