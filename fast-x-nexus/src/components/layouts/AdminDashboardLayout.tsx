'use client';

/**
 * /src/components/layouts/AdminDashboardLayout.tsx
 * Fast X Nexus — Admin Dashboard Layout
 */

import React, { useState } from 'react';
import { Header } from '@/components/Header/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

export function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <VisibilityWrapper roles={['admin']}>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col md:ml-52 h-screen overflow-hidden min-w-0">
          <Header onMenuToggle={() => setIsSidebarOpen(true)} />
          <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </VisibilityWrapper>
  );
}
