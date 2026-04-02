import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/observability';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, {
      source: 'react.error_boundary',
      componentStack: errorInfo?.componentStack || '',
    });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
          <div className="max-w-md w-full rounded-3xl border border-red-100 bg-white p-8 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Κάτι πήγε στραβά</h1>
            <p className="text-sm text-slate-500 mt-2">
              Το συμβάν καταγράφηκε για διερεύνηση. Μπορείς να κάνεις ανανέωση και να ξαναδοκιμάσεις.
            </p>
            <Button onClick={this.handleReload} className="mt-6 gap-2 rounded-xl">
              <RefreshCw className="w-4 h-4" />
              Ανανέωση εφαρμογής
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
