'use client';

/**
 * ProfileCard — Editable personal information card
 *
 * Swiss-styled info card with inline editing.
 * Disables auth credential editing (email, phone) to protect session consistency,
 * while permitting the user to update their name and active WhatsApp contact.
 */

import React from 'react';

interface ProfileCardProps {
  fullName: string;
  email: string;
  phone: string;
  whatsappContact: string;
  preferredPickupAddress: string;
  onFieldChange: (field: string, value: string) => void;
}

export function ProfileCard({ 
  fullName, 
  email, 
  phone, 
  whatsappContact, 
  preferredPickupAddress,
  onFieldChange 
}: ProfileCardProps) {
  return (
    <div className="bg-surface-elevated border border-border border-l-[3px] border-l-primary p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">person</span>
        <h3 className="text-sm font-black uppercase tracking-widest text-text font-mono">
          Personal Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-1 block">
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={fullName}
              onChange={(e) => onFieldChange('fullName', e.target.value)}
              className="w-full bg-surface border border-border pl-3 pr-10 py-2.5 text-sm text-text outline-none transition-all duration-[var(--duration-200)] focus:border-primary font-sans text-ellipsis overflow-hidden"
              placeholder="Your full name"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[16px]" aria-hidden="true">edit</span>
          </div>
        </div>

        {/* WhatsApp Contact */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-1 block">
            WhatsApp Contact
          </label>
          <div className="relative">
            <input
              type="tel"
              value={whatsappContact}
              onChange={(e) => onFieldChange('whatsappContact', e.target.value)}
              className="w-full bg-surface border border-border pl-3 pr-10 py-2.5 text-sm text-text outline-none transition-all duration-[var(--duration-200)] focus:border-primary font-sans text-ellipsis overflow-hidden"
              placeholder="+234 801 234 5678"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[16px]" aria-hidden="true">edit</span>
          </div>
        </div>

        {/* Email (Read-Only) */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-1 block">
            Email Address (Credentials)
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-surface-dim border border-border pl-3 pr-10 py-2.5 text-sm text-text-muted outline-none font-sans cursor-not-allowed text-ellipsis overflow-hidden"
              placeholder="your@email.com"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[16px] opacity-50" aria-hidden="true">lock</span>
          </div>
        </div>

        {/* Phone Credentials (Read-Only) */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-1 block">
            Authentication Phone
          </label>
          <div className="relative">
            <input
              type="tel"
              value={phone || 'None'}
              disabled
              className="w-full bg-surface-dim border border-border pl-3 pr-10 py-2.5 text-sm text-text-muted outline-none font-sans cursor-not-allowed text-ellipsis overflow-hidden"
              placeholder="No auth phone set"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[16px] opacity-50" aria-hidden="true">lock</span>
          </div>
        </div>

        {/* Preferred Pickup Address */}
        <div className="md:col-span-2 pt-1 border-t border-border/50">
          <label className="text-[10px] font-mono font-black uppercase tracking-wider text-text-dim mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary" aria-hidden="true">home_pin</span>
              Preferred Pickup Address (Default Origin)
            </span>
            <span className="text-[9px] text-text-muted font-sans font-normal lowercase">
              prefilled in booking engine
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={preferredPickupAddress}
              onChange={(e) => onFieldChange('preferredPickupAddress', e.target.value)}
              className="w-full bg-surface border border-border pl-3 pr-10 py-2.5 text-sm text-text outline-none transition-all duration-[var(--duration-200)] focus:border-primary font-sans text-ellipsis overflow-hidden"
              placeholder="e.g. 1004 Estate, Victoria Island, Lagos"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-dim text-[16px]" aria-hidden="true">edit</span>
          </div>
        </div>
      </div>
    </div>
  );
}