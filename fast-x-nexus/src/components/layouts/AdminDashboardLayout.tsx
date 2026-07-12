'use client';

import React from 'react';
import { Header } from '@/components/Header/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { Footer } from '@/components/Footer/Footer';
import { VisibilityWrapper } from '@/components/ui/VisibilityWrapper';

export function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <VisibilityWrapper roles={['admin']}>
      <div className="flex min-h-screen bg-[#F9FAFB]">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-64">
          <Header />
          <main className="flex-1 pt-[64px] px-6 py-8">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </VisibilityWrapper>
  );
}
