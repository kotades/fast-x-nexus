'use client';

/**
 * TrackingNumber — Large Mono Display with Copy
 *
 * 48px JetBrains Mono tracking number with copy-to-clipboard button.
 * Uses Framer Motion for copy feedback animation.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackingNumberProps {
  code: string;
  className?: string;
}

export function TrackingNumber({ code, className = '' }: TrackingNumberProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="font-mono text-4xl md:text-5xl font-black text-text tracking-tight">
        {code}
      </span>
      <button
        onClick={handleCopy}
        className="p-2 text-text-muted hover:text-primary hover:bg-surface-low transition-all cursor-pointer"
        aria-label={copied ? 'Copied' : 'Copy tracking number'}
        title={copied ? 'Copied!' : 'Copy'}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="material-symbols-outlined text-lg text-success"
            >
              check
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="material-symbols-outlined text-lg"
            >
              content_copy
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}