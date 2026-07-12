'use client';

/**
 * Modal — Refactored with Framer Motion + Design Tokens
 *
 * Swiss-styled confirmation modal with AnimatePresence spring physics,
 * backdrop blur, focus trapping, and semantic design tokens.
 *
 * Source: ckm:design-system states-and-variants + Kota Skillz button-styles
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  /** Roles allowed to see and interact with this modal */
  roles: ('admin' | 'vendor' | 'rider' | 'customer' | 'guest')[];
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 250, mass: 1 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  primaryActionLabel,
  secondaryActionLabel = 'Cancel',
  onPrimaryAction,
  roles,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trapping
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <VisibilityWrapper roles={roles}>
          <motion.div
            key="modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 md:p-6"
            style={{ backgroundColor: 'rgba(25, 28, 29, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          >
            <motion.div
              ref={modalRef}
              key="modal-dialog"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              className="bg-surface-elevated w-full max-w-lg outline-none border-t-[4px] border-t-primary border border-border shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            >
              {/* Content */}
              <div className="p-6">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-sm font-black uppercase tracking-widest text-text mb-3 font-mono"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-text-muted leading-relaxed font-sans">
                    {description}
                  </p>
                )}
                {children}
              </div>

              {/* Actions */}
              {(primaryActionLabel || secondaryActionLabel) && (
                <div className="px-6 py-4 bg-surface-low flex items-center justify-end gap-3 border-t border-border">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 border border-border text-text-muted font-mono text-[10px] font-black uppercase tracking-widest hover:bg-surface-dim active:scale-[0.97] transition-all duration-[var(--duration-200)] cursor-pointer"
                  >
                    {secondaryActionLabel}
                  </button>
                  {primaryActionLabel && onPrimaryAction && (
                    <button
                      onClick={onPrimaryAction}
                      className="px-4 py-2.5 bg-primary border border-primary text-primary-text font-mono text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover active:scale-[0.97] transition-all duration-[var(--duration-200)] cursor-pointer"
                    >
                      {primaryActionLabel}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </VisibilityWrapper>
      )}
    </AnimatePresence>
  );
}