import React from 'react';
import { Outlet } from 'react-router-dom';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import Sidebar from './Sidebar';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppLayout() {
  useActivityTracking();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="fixed top-0 right-0 z-30 p-3 lg:p-4">
          <LanguageSwitcher />
        </div>
        <div className="p-4 lg:p-6 pt-14 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}