'use client';

/**
 * /src/components/layouts/RiderDashboardLayout.tsx
 * Fast X Nexus — Rider Dashboard Layout
 */

import React from 'react';
import { Header } from '@/components/Header/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { RiderDispatchChat } from '@/components/chat/RiderDispatchChat';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

export function RiderDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <VisibilityWrapper roles={['rider']}>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col md:ml-52 h-screen overflow-hidden min-w-0">
          <Header onMenuToggle={() => setIsSidebarOpen(true)} />
          <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {children}
          </main>
        </div>
        <RiderDispatchChat />
      </div>
    </VisibilityWrapper>
  );
}