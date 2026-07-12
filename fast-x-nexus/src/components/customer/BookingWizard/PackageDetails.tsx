'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Input } from '@/components/customer/ui/Input';

const WEIGHT_PRESETS = [
  { id: 'document' as const, label: 'Document/Flyer', desc: 'Up to 0.5kg' },
  { id: 'small_box' as const, label: 'Small Box', desc: 'Up to 5kg' },
  { id: 'medium_box' as const, label: 'Medium Box', desc: 'Up to 15kg' },
];

export function PackageDetails() {
  const { wizardData, updateWizardData } = useCustomerDashboard();

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-2xl font-bold text-text mb-6 tracking-tight">PACKAGE DETAILS</h1>

      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-text-muted block mb-2">
            Item Description
          </label>
          <textarea
            className="w-full bg-surface-low border-b-2 border-border focus:border-primary focus:outline-none p-3 text-text font-sans text-sm resize-none transition-colors"
            placeholder="Describe the items in the package..."
            rows={3}
            value={wizardData.itemDescription}
            onChange={(e) => updateWizardData({ itemDescription: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-text-muted block mb-3">
            Weight Category
          </label>
          <div className="grid grid-cols-1 gap-2">
            {WEIGHT_PRESETS.map((preset) => {
              const isActive = wizardData.weightPreset === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  onClick={() => updateWizardData({ weightPreset: preset.id })}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex justify-between items-center p-4 border-l-4
                    transition-all duration-[var(--duration-200)]
                    ${isActive
                      ? 'bg-primary text-primary-text border-l-primary'
                      : 'bg-surface-low text-text border-l-transparent hover:border-l-primary hover:bg-surface-dim'
                    }
                  `}
                >
                  <div className="text-left">
                    <p className={`font-bold ${isActive ? 'text-primary-text' : 'text-text'}`}>
                      {preset.label}
                    </p>
                    <p className={`text-sm ${isActive ? 'text-primary-text/80' : 'text-text-muted'}`}>
                      {preset.desc}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <Input
          label="Budget Estimate (₦)"
          type="number"
          prefix="payments"
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
    </motion.div>
  );
}
