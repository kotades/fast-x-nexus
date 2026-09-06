'use client';

/**
 * /src/components/customer/BookingWizard/PackageDetails.tsx
 * Fast X Nexus — Package Specification & Weight Category
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';

const WEIGHT_PRESETS = [
  { id: 'document' as const, label: 'Document / Flyer', desc: 'Up to 0.5kg', icon: 'description' },
  { id: 'small_box' as const, label: 'Small Box', desc: 'Up to 5kg', icon: 'inventory_2' },
  { id: 'medium_box' as const, label: 'Medium Box', desc: 'Up to 15kg', icon: 'package_2' },
];

const QUICK_ITEM_TAGS = ['Documents', 'Clothing', 'Electronics', 'Food / Provisions'];

export function PackageDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();

  return (
    <motion.div
      className="max-w-3xl mx-auto font-sans"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Step Header (Hidden on mobile to maximize viewport) */}
      <div className="hidden sm:flex border-b border-border pb-2.5 mb-4 items-center justify-between gap-1">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-primary">
            STEP 3 OF 4 / CARGO SPECIFICATION
          </span>
          <h2 className="text-xl font-black text-text uppercase tracking-tight">
            Package Details
          </h2>
        </div>
        <p className="text-xs text-text-muted font-mono">
          Specify parcel weight, contents, and delivery time
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Weight Category — 3 Horizontal Cards */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-text-muted block mb-1.5">
            Weight Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {WEIGHT_PRESETS.map((preset) => {
              const isActive = wizardData.weightPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateWizardData({ weightPreset: preset.id })}
                  className={`
                    p-3 text-left border transition-all cursor-pointer relative flex items-center gap-3
                    ${isActive
                      ? 'bg-emerald-50/70 border-primary ring-1 ring-primary'
                      : 'bg-surface border-border hover:border-slate-300 hover:bg-surface-elevated'
                    }
                  `}
                >
                  <div
                    className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{preset.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight ${isActive ? 'text-primary' : 'text-text'}`}>
                      {preset.label}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {preset.desc}
                    </p>
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Left = Description + Tags, Right = Budget & Delivery Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* Left: Item Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-text-muted block">
              Item Description
            </label>
            <textarea
              className="w-full bg-surface border border-border focus:border-primary focus:outline-none p-2.5 text-text font-sans text-xs resize-none transition-colors h-[86px] rounded-none placeholder:text-text-muted/60"
              placeholder="Describe parcel items (e.g. 2 pairs of sneakers, spare parts, laptop battery)..."
              value={wizardData.itemDescription}
              onChange={(e) => updateWizardData({ itemDescription: e.target.value })}
            />
            {/* Quick selection tags */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_ITEM_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const current = wizardData.itemDescription.trim();
                    const updated = current ? `${current}, ${tag}` : tag;
                    updateWizardData({ itemDescription: updated });
                  }}
                  className="px-2 py-0.5 bg-surface-elevated border border-border hover:border-primary text-[10px] font-medium text-text-muted hover:text-primary transition-all cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Budget Estimate & Preferred Delivery Time */}
          <div className="space-y-3">
            <Input
              label="Budget Estimate (₦) — Optional"
              type="number"
              prefix="payments"
              placeholder="e.g. 2500"
              value={wizardData.budgetEstimate || ''}
              onChange={(e) => updateWizardData({ budgetEstimate: Number(e.target.value) })}
            />

            <Input
              label="Preferred Delivery Time"
              type="datetime-local"
              prefix="schedule"
              value={wizardData.preferredDeliveryTime || ''}
              onChange={(e) => updateWizardData({ preferredDeliveryTime: e.target.value })}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
