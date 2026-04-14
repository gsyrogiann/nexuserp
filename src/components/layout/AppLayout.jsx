import React from 'react';
import { Outlet } from 'react-router-dom';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { runtimeConfig } from '@/lib/runtime-config';
import Sidebar from './Sidebar';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppLayout() {
  useActivityTracking();

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className={`${runtimeConfig.isBase44PreviewShell ? 'absolute' : 'fixed'} top-0 right-0 z-30 p-3 lg:p-4 pointer-events-none`}>
          <div className="pointer-events-auto">
            <LanguageSwitcher />
          </div>
        </div>
        {runtimeConfig.isLocalRuntime && (
          <div className="fixed bottom-4 left-4 z-30 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 shadow-lg">
            Local Runtime
          </div>
        )}
        <div className="p-4 lg:p-6 pt-14 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
