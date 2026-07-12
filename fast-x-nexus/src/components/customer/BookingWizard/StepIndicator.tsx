'use client';

/**
 * StepIndicator — Swiss-Style 4-Step Stepper
 *
 * Visual step progress: Presets → Landmarks → Summary → Checkout
 * Uses Framer Motion for animated progress bar.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { WizardStep } from '@/components/customer/contexts/CustomerDashboardContext';

const STEPS = [
  { step: 1 as WizardStep, label: 'Pickup Details' },
  { step: 2 as WizardStep, label: 'Recipient Details' },
  { step: 3 as WizardStep, label: 'Package Details' },
  { step: 4 as WizardStep, label: 'Checkout' },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="bg-surface border-b border-border overflow-x-auto">
      <div className="max-w-[1400px] mx-auto flex items-stretch">
        {STEPS.map(({ step, label }) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          const isFuture = currentStep < step;

          return (
            <div
              key={step}
              className={`
                py-4 px-5 md:px-6 flex items-center gap-2 relative
                ${isActive ? 'cursor-default' : isFuture ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
                ${isCompleted ? 'opacity-70' : ''}
              `}
            >
              <span
                className={`
                  text-xs font-bold tracking-tighter font-mono
                  ${isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-text-muted'}
                `}
              >
                {isCompleted ? '✓' : `0${step}`}
              </span>
              <span
                className={`
                  text-xs font-bold uppercase tracking-widest whitespace-nowrap
                  ${isActive ? 'text-text' : 'text-text-muted'}
                `}
              >
                {label}
              </span>
              {/* Active underline */}
              {isActive && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}