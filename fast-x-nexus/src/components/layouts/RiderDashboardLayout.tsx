'use client';

import React from 'react';
import { Header } from '@/components/Header/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Footer } from '@/components/Footer/Footer';
import { ChatWidget } from '@/components/customer/shared/ChatWidget';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

export function RiderDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <VisibilityWrapper roles={['rider']}>
      <div className="flex min-h-screen bg-[#F9FAFB]">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-52">
          <Header />
          <main className="flex-1 pt-[64px] px-6 py-8">
            {children}
          </main>
          <Footer />
        </div>
        <ChatWidget />
      </div>
    </VisibilityWrapper>
  );
}