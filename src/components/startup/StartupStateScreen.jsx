import React from 'react';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StartupStateScreen({
  title,
  description,
  showSpinner = false,
  diagnostics = null,
  onRetry,
  primaryActionLabel = 'Δοκίμασε ξανά',
  onSecondaryAction,
  secondaryActionLabel = 'Σύνδεση',
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 px-6 z-50">
      <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${showSpinner ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          {showSpinner ? <Loader2 className="w-8 h-8 animate-spin" /> : <AlertTriangle className="w-8 h-8" />}
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>

        {diagnostics ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" />
              Diagnostic info
            </div>
            <p className="text-sm text-slate-600 mt-2">{diagnostics}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {onRetry ? (
            <Button onClick={onRetry} className="flex-1 gap-2 rounded-xl">
              <RefreshCw className="w-4 h-4" />
              {primaryActionLabel}
            </Button>
          ) : null}
          {onSecondaryAction ? (
            <Button variant="outline" onClick={onSecondaryAction} className="flex-1 rounded-xl">
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RouteLoadingFallback({ label = 'σελίδας' }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
        Φόρτωση {label}
      </p>
    </div>
  );
}
