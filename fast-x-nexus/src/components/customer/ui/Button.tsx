'use client';

/**
 * Button — Variant System with 6 States
 *
 * Variants:   primary | secondary | ghost | danger
 * Sizes:      sm | md | lg
 * States:     default | hover | active | focus | loading | disabled
 *
 * Design: Swiss Industrial — sharp corners, spring physics press, high contrast
 * Source: ckm:design-system states-and-variants + Kota Skillz button-styles
 */

import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, { base: string; loading: string }> = {
  primary: {
    base: 'bg-primary text-primary-text border-0 hover:bg-primary-hover active:scale-[var(--state-active-scale)]',
    loading: 'bg-primary-disabled text-primary-text/70',
  },
  secondary: {
    base: 'bg-surface text-text border border-border hover:bg-surface-low active:scale-[var(--state-active-scale)]',
    loading: 'bg-surface-low text-text-dim border-border',
  },
  ghost: {
    base: 'bg-transparent text-text-muted border-0 hover:bg-surface-low active:bg-surface-dim active:scale-[var(--state-active-scale)]',
    loading: 'text-text-dim',
  },
  danger: {
    base: 'bg-error text-white border-0 hover:bg-red-600 active:scale-[var(--state-active-scale)]',
    loading: 'bg-red-500/50 text-white/70',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs font-semibold gap-1.5',
  md: 'h-11 px-5 text-sm font-semibold gap-2',
  lg: 'h-14 px-7 text-base font-bold gap-2.5',
};

const motionProps = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', damping: 15, stiffness: 300 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      fullWidth = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const variantSet = variantClasses[variant];

    return (
      <motion.button
        ref={ref as any}
        disabled={isDisabled}
        {...(isDisabled ? {} : motionProps)}
        className={`
          inline-flex items-center justify-center whitespace-nowrap
          font-sans uppercase tracking-wider
          rounded-none
          transition-all duration-[var(--duration-200)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-border-focus)]
          disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed disabled:pointer-events-none
          ${variantSet.base}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${loading ? variantSet.loading : ''}
          ${className}
        `}
        {...(props as any)}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : icon ? (
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';