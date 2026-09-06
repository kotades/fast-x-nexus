'use client';

/**
 * /src/components/layouts/CustomerDashboardLayout.tsx
 * Fast X Nexus — Customer Dashboard Layout
 *
 * Sticky header + natural flex column layout.
 * Guarantees zero component clipping across all views.
 */

import React from 'react';
import { Header } from '@/components/Header/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { FloatingSupportChat } from '@/components/chat/FloatingSupportChat';
import { CustomerDashboardProvider } from '@/components/customer/contexts/CustomerDashboardContext';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

export function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <VisibilityWrapper roles={['customer']}>
      <CustomerDashboardProvider>
        <div className="flex h-screen overflow-hidden bg-[#F9FAFB]">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <div className="flex-1 flex flex-col md:ml-52 h-screen overflow-hidden min-w-0">
            <Header onMenuToggle={() => setIsSidebarOpen(true)} />
            <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              {children}
            </main>
          </div>
          <FloatingSupportChat />
        </div>
      </CustomerDashboardProvider>
    </VisibilityWrapper>
  );
}