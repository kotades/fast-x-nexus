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
  { step: 1 as WizardStep, label: 'Pickup Details', shortLabel: 'Pickup' },
  { step: 2 as WizardStep, label: 'Recipient Details', shortLabel: 'Recipient' },
  { step: 3 as WizardStep, label: 'Package Details', shortLabel: 'Package' },
  { step: 4 as WizardStep, label: 'Checkout', shortLabel: 'Summary' },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="bg-surface border-b border-border overflow-x-auto scrollbar-hide">
      <div className="max-w-[1400px] mx-auto flex items-stretch justify-between sm:justify-start">
        {STEPS.map(({ step, label, shortLabel }) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          const isFuture = currentStep < step;

          return (
            <div
              key={step}
              onClick={() => {
                if (isCompleted && onStepClick) {
                  onStepClick(step);
                }
              }}
              className={`
                py-1.5 px-2 sm:py-2.5 sm:px-5 flex items-center gap-1 sm:gap-2 relative flex-shrink-0 select-none
                ${isActive ? 'cursor-default' : isFuture ? 'cursor-not-allowed opacity-30' : isCompleted ? 'cursor-pointer hover:opacity-100' : 'cursor-pointer'}
                ${isCompleted ? 'opacity-80' : ''}
              `}
            >
              <span
                className={`
                  text-[10px] sm:text-xs font-bold tracking-tighter font-mono
                  ${isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-text-muted'}
                `}
              >
                {isCompleted ? '✓' : `0${step}`}
              </span>
              <span
                className={`
                  text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap
                  ${isActive ? 'text-text' : 'text-text-muted'}
                `}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
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