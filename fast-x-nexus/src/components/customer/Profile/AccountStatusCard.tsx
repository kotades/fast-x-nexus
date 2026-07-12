'use client';

/**
 * AccountStatusCard — Read-only account information
 *
 * Displays role, active status, member since, WhatsApp verification.
 */

import React from 'react';
import { Badge } from '@/components/customer/ui/Badge';

interface AccountStatusCardProps {
  role: string;
  activeStatus: boolean;
  memberSince: string;
  whatsappContact: string | null;
  whatsappVerified: boolean;
}

export function AccountStatusCard({
  role,
  activeStatus,
  memberSince,
  whatsappContact,
  whatsappVerified,
}: AccountStatusCardProps) {
  return (
    <div className="bg-surface-elevated border border-border border-l-[3px] border-l-accent p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="material-symbols-outlined text-accent-dark">verified</span>
        <h3 className="text-sm font-black uppercase tracking-widest text-text font-mono">
          Account Information
        </h3>
      </div>
      <div className="flex flex-col gap-4">
        {/* Role & Status Row */}
        <div className="flex justify-between items-center py-2.5 border-b border-border">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Role</span>
          <Badge size="sm">{role}</Badge>
        </div>
        <div className="flex justify-between items-center py-2.5 border-b border-border">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Active Status</span>
          <Badge size="sm" pulse={activeStatus}>
            {activeStatus ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex justify-between items-center py-2.5 border-b border-border">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Member Since</span>
          <span className="text-xs font-mono text-text font-bold">{memberSince}</span>
        </div>
        <div className="flex justify-between items-center py-2.5">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">WhatsApp</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-mono text-text font-bold">
              {whatsappContact || 'Not set'}
            </span>
            {whatsappVerified && (
              <span className="text-success material-symbols-outlined text-[14px]">check_circle</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}