'use client';

/**
 * Dropdown — Refactored with Framer Motion AnimatePresence + Design Tokens
 *
 * Swiss-styled dropdown with spring physics open/close transitions,
 * semantic design tokens, and Material Symbols for icons.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

interface DropdownProps {
  label: string;
  items: DropdownItem[];
  /** Roles allowed to see and interact with this dropdown */
  roles: ('admin' | 'vendor' | 'rider' | 'customer' | 'guest')[];
}

const menuVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 20, stiffness: 200 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Dropdown({ label, items, roles }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <VisibilityWrapper roles={roles}>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-black uppercase tracking-widest text-text bg-surface-elevated border border-border hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus transition-all duration-[var(--duration-200)] cursor-pointer font-sans"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {label}
          <motion.svg
            className="w-4 h-4 ml-2.5 -mr-1 text-text-muted"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </motion.svg>
        </button>

        {/* Menu Panel with AnimatePresence */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="dropdown-menu"
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute right-0 mt-1 w-56 origin-top-right bg-surface-elevated border border-border shadow-lg z-[var(--z-dropdown)] outline-none"
              role="menu"
              aria-orientation="vertical"
              tabIndex={-1}
            >
              <div className="py-1" role="none">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick();
                      setIsOpen(false);
                    }}
                    className="w-full text-left flex items-center px-4 py-2.5 text-xs font-sans font-bold text-text-muted hover:bg-surface-low hover:text-primary border-l-[3.5px] border-transparent hover:border-primary transition-all duration-[var(--duration-200)] cursor-pointer uppercase tracking-wider"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    {item.icon && (
                      <span className="material-symbols-outlined text-[16px] mr-3 text-text-dim">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VisibilityWrapper>
  );
}