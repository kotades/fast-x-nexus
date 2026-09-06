'use client';

/**
 * /src/components/ui/FeedbackModal.tsx
 * Fast X Nexus — Light & Clean Feedback & Confirmation Modal
 *
 * Designed with 100% bright, clean light-mode aesthetics:
 * - Crisp white surfaces (#ffffff)
 * - Light slate & brand forest green palette
 * - Soft translucent scrim backdrop (no heavy dark overlays)
 * - Sharp typography: dark charcoal on pure white
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type FeedbackType = 'error' | 'confirm' | 'warning' | 'success' | 'info';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string | null;
  type?: FeedbackType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  isLoading?: boolean;
}

const TYPE_CONFIG: Record<
  FeedbackType,
  {
    icon: string;
    tag: string;
    borderTopClass: string;
    badgeClass: string;
    iconBgClass: string;
    primaryBtnClass: string;
    defaultConfirmLabel: string;
    defaultCancelLabel: string;
  }
> = {
  error: {
    icon: 'error',
    tag: 'SYSTEM ERROR',
    borderTopClass: 'border-t-4 border-t-red-600',
    badgeClass: 'bg-red-50 text-red-700 border border-red-200',
    iconBgClass: 'bg-red-50 text-red-600 border border-red-100',
    primaryBtnClass: 'bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm',
    defaultConfirmLabel: 'Retry Action',
    defaultCancelLabel: 'Dismiss',
  },
  confirm: {
    icon: 'warning',
    tag: 'CONFIRMATION REQUIRED',
    borderTopClass: 'border-t-4 border-t-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    iconBgClass: 'bg-amber-50 text-amber-600 border border-amber-100',
    primaryBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm',
    defaultConfirmLabel: 'Proceed',
    defaultCancelLabel: 'Cancel',
  },
  warning: {
    icon: 'warning',
    tag: 'DISPATCH ADVISORY',
    borderTopClass: 'border-t-4 border-t-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    iconBgClass: 'bg-amber-50 text-amber-600 border border-amber-100',
    primaryBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm',
    defaultConfirmLabel: 'Acknowledge',
    defaultCancelLabel: 'Close',
  },
  success: {
    icon: 'check_circle',
    tag: 'OPERATION CONFIRMED',
    borderTopClass: 'border-t-4 border-t-[#347227]',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    iconBgClass: 'bg-emerald-50 text-[#347227] border border-emerald-100',
    primaryBtnClass: 'bg-[#347227] hover:bg-[#1a5910] text-white font-bold shadow-sm',
    defaultConfirmLabel: 'Continue',
    defaultCancelLabel: 'Close',
  },
  info: {
    icon: 'info',
    tag: 'TELEMETRY NOTICE',
    borderTopClass: 'border-t-4 border-t-blue-600',
    badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200',
    iconBgClass: 'bg-blue-50 text-blue-600 border border-blue-100',
    primaryBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm',
    defaultConfirmLabel: 'Got It',
    defaultCancelLabel: 'Close',
  },
};

export function FeedbackModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  type = 'info',
  confirmLabel,
  cancelLabel,
  onConfirm,
  isLoading = false,
}: FeedbackModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  // Focus modal on open
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      setShowDetails(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const hasSecondaryAction = Boolean(onConfirm) || type === 'confirm';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="feedback-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!isLoading) onClose();
          }}
        >
          <motion.div
            ref={modalRef}
            key="feedback-card"
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            aria-describedby="feedback-message"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', damping: 26, stiffness: 320 },
            }}
            exit={{ opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.12 } }}
            className={`bg-white w-full max-w-md border border-slate-200 shadow-2xl rounded-xl ${cfg.borderTopClass} flex flex-col outline-none overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Bar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] font-black tracking-wider px-2 py-0.5 rounded ${cfg.badgeClass}`}
                >
                  {cfg.tag}
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-medium">• FAST X</span>
              </div>
              {!isLoading && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                  aria-label="Close dialog"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 bg-white">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.iconBgClass}`}
                >
                  <span className="material-symbols-outlined text-xl">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id="feedback-title"
                    className="text-base font-bold text-slate-900 tracking-tight uppercase font-sans"
                  >
                    {title}
                  </h3>
                  <p
                    id="feedback-message"
                    className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 font-sans"
                  >
                    {message}
                  </p>
                </div>
              </div>

              {/* Collapsible Technical Details (if any) */}
              {details && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {showDetails ? 'expand_less' : 'expand_more'}
                    </span>
                    <span>{showDetails ? 'Hide Diagnostics' : 'View Diagnostics & Details'}</span>
                  </button>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] text-slate-700 leading-relaxed overflow-x-auto max-h-36 select-text"
                      >
                        {details}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              {/* Secondary / Cancel Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-sans text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel || (hasSecondaryAction ? cfg.defaultCancelLabel : 'Close')}
              </button>

              {/* Primary Confirm Button */}
              {hasSecondaryAction && (
                <button
                  type="button"
                  onClick={async () => {
                    if (onConfirm) {
                      await onConfirm();
                    } else {
                      onClose();
                    }
                  }}
                  disabled={isLoading}
                  className={`px-4 py-2 font-sans text-xs font-semibold rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${cfg.primaryBtnClass}`}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">
                        progress_activity
                      </span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{confirmLabel || cfg.defaultConfirmLabel}</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
