'use client';

/**
 * Input — Floating Label with Error State
 *
 * States: default, focus, error, disabled, loading
 * Design: Swiss Industrial — sharp corners, bottom-border focus, inline errors
 */

import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  fullWidth = true,
  className = '',
  id: externalId,
  onFocus,
  onBlur,
  value,
  defaultValue,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = externalId || generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined ? !!String(value) : !!defaultValue;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const isTypeWithNativePlaceholder = [
    'date',
    'datetime-local',
    'time',
    'month',
    'week',
    'file',
    'color',
  ].includes(props.type || '');

  const isFloating = isFocused || hasValue || isTypeWithNativePlaceholder || !!props.placeholder;

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className="relative">
        {/* Prefix Icon */}
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10">
            <span className="material-symbols-outlined text-[18px]">{prefix}</span>
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`
            peer w-full h-14
            bg-surface-low border-b-2
            text-text font-sans text-sm
            transition-all duration-[var(--duration-200)]
            focus:outline-none focus:ring-0
            disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed
            placeholder-transparent
            ${error ? 'border-error' : 'border-border focus:border-border-focus'}
            ${prefix ? 'pl-10' : 'pl-3'}
            pr-3 pt-5 pb-1
          `}
          placeholder={label}
          {...props}
        />

        {/* Floating Label */}
        <label
          htmlFor={inputId}
          className={`
            absolute left-0 pointer-events-none
            transition-all duration-[var(--duration-200)] ease-out
            ${prefix ? 'left-10' : 'left-3'}
            ${isFloating ? 'top-1.5 text-[10px] font-mono uppercase font-bold tracking-wider' : 'top-1/2 -translate-y-1/2 text-sm font-sans'}
            ${error ? 'text-error' : isFocused ? 'text-primary' : 'text-text-muted'}
          `}
        >
          {label}
        </label>
      </div>

      {/* Error / Hint Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs font-medium text-error ml-1"
            role="alert"
          >
            {error}
          </motion.p>
        )}
        {!error && hint && (
          <p className="text-xs text-text-muted ml-1">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  );
}