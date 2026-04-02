import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { PermissionsProvider, usePermissions } from '@/lib/usePermissions.jsx';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import { reportOperationalEvent } from '@/lib/observability';
import { STARTUP_SLOW_UI_MS } from '@/lib/startup';
import { RouteLoadingFallback, StartupStateScreen } from '@/components/startup/StartupStateScreen';
import AIAssistant from './pages/AIAssistant';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Quotes = lazy(() => import('./pages/Quotes'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const SalesInvoices = lazy(() => import('./pages/SalesInvoices'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseInvoices = lazy(() => import('./pages/PurchaseInvoices'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const EmailSettings = lazy(() => import('./pages/EmailSettings'));
const UnmatchedEmails = lazy(() => import('./pages/UnmatchedEmails'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Calendar = lazy(() => import('./pages/Calendar'));
const SalesPipeline = lazy(() => import('./pages/SalesPipeline'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const MyEmailSettings = lazy(() => import('./pages/MyEmailSettings'));
const LiveUsers = lazy(() => import('./pages/LiveUsers'));
const AIInteractionsHistory = lazy(() => import('./pages/AIInteractionsHistory'));

const AccessDenied = () => (
  <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm">
      <Lock className="w-10 h-10 text-red-600" />
    </div>
    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Πρόσβαση Περιορισμένη</h2>
    <p className="text-slate-500 max-w-sm mt-2 text-sm font-medium">
      Αυτή η ενότητα του Nexus ERP είναι διαθέσιμη μόνο σε λογαριασμούς με τα απαραίτητα δικαιώματα.
    </p>
    <Button
      variant="outline"
      className="mt-8 rounded-xl font-bold border-slate-200"
      onClick={() => window.location.href = '/Dashboard'}
    >
      Επιστροφή στο Dashboard
    </Button>
  </div>
);

const ProtectedRoute = ({ featureKey, children }) => {
  const { canAccess, loading } = usePermissions();
  if (loading) return <RouteLoadingFallback label="δικαιωμάτων" />;
  if (!canAccess(featureKey)) return <AccessDenied />;
  return children;
};

const LazyRoute = ({ label, children }) => (
  <Suspense fallback={<RouteLoadingFallback label={label} />}>
    {children}
  </Suspense>
);

const StartupDiagnosticsBanner = ({ permissionsError, onRetryPermissions }) => {
  if (!permissionsError) {
    return null;
  }

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold">Η εφαρμογή άνοιξε σε ασφαλές degraded mode</p>
          <p className="mt-1">{permissionsError.message}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl border-amber-300 bg-white" onClick={onRetryPermissions}>
          Retry
        </Button>
      </div>
    </div>
  );
};

const RouteRenderReporter = () => {
  const location = useLocation();
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (hasReportedRef.current) {
      return;
    }

    hasReportedRef.current = true;
    reportOperationalEvent('first_route_rendered', {
      path: location.pathname,
    });
  }, [location.pathname]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, retryAuthBootstrap } = useAuth();
  const { loading: permLoading, error: permissionsError, retryPermissionsBootstrap } = usePermissions();
  const [showSlowStartupState, setShowSlowStartupState] = useState(false);

  const bootLoading = isLoadingPublicSettings || isLoadingAuth || permLoading;

  useEffect(() => {
    if (!bootLoading) {
      setShowSlowStartupState(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowSlowStartupState(true);
    }, STARTUP_SLOW_UI_MS);

    return () => window.clearTimeout(timeoutId);
  }, [bootLoading]);

  if (bootLoading) {
    return (
      <StartupStateScreen
        title={showSlowStartupState ? 'Η εκκίνηση αργεί περισσότερο από το αναμενόμενο' : 'Φόρτωση εφαρμογής'}
        description={showSlowStartupState
          ? 'Ελέγχουμε σύνδεση και δικαιώματα. Αν το backend αργεί, μπορείς να ξαναδοκιμάσεις χωρίς να μείνει η εφαρμογή σε μόνιμο loading.'
          : 'Γίνεται ασφαλής έλεγχος σύνδεσης και δικαιωμάτων...'}
        diagnostics={showSlowStartupState ? 'Αν το πρόβλημα επιμένει, χρησιμοποίησε Retry για νέο auth/permissions bootstrap.' : null}
        showSpinner
        onRetry={() => {
          retryAuthBootstrap();
          retryPermissionsBootstrap();
        }}
      />
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') {
      return (
        <StartupStateScreen
          title="Χρειάζεται νέα σύνδεση"
          description={authError.message}
          diagnostics="Το auth bootstrap ολοκληρώθηκε αλλά δεν βρέθηκε ενεργό session."
          onRetry={retryAuthBootstrap}
          onSecondaryAction={navigateToLogin}
          secondaryActionLabel="Σύνδεση"
        />
      );
    }

    return (
      <StartupStateScreen
        title="Δεν ολοκληρώθηκε η εκκίνηση"
        description={authError.message}
        diagnostics="Το app βγήκε από το loading state και κατέγραψε το συμβάν για διερεύνηση."
        onRetry={retryAuthBootstrap}
        onSecondaryAction={navigateToLogin}
        secondaryActionLabel="Σύνδεση"
      />
    );
  }

  return (
    <>
      <StartupDiagnosticsBanner permissionsError={permissionsError} onRetryPermissions={retryPermissionsBootstrap} />
      <RouteRenderReporter />
      <Routes>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/Dashboard" element={<ProtectedRoute featureKey="dashboard"><LazyRoute label="dashboard"><Dashboard /></LazyRoute></ProtectedRoute>} />
          <Route path="/Calendar" element={<ProtectedRoute featureKey="calendar"><LazyRoute label="calendar"><Calendar /></LazyRoute></ProtectedRoute>} />
          <Route path="/Customers" element={<ProtectedRoute featureKey="customers"><LazyRoute label="customers"><Customers /></LazyRoute></ProtectedRoute>} />
          <Route path="/Suppliers" element={<ProtectedRoute featureKey="suppliers"><LazyRoute label="suppliers"><Suppliers /></LazyRoute></ProtectedRoute>} />
          <Route path="/SalesPipeline" element={<ProtectedRoute featureKey="sales_pipeline"><LazyRoute label="sales pipeline"><SalesPipeline /></LazyRoute></ProtectedRoute>} />
          <Route path="/Products" element={<ProtectedRoute featureKey="products"><LazyRoute label="products"><Products /></LazyRoute></ProtectedRoute>} />
          <Route path="/Inventory" element={<ProtectedRoute featureKey="inventory"><LazyRoute label="inventory"><Inventory /></LazyRoute></ProtectedRoute>} />
          <Route path="/Tickets" element={<ProtectedRoute featureKey="tickets"><LazyRoute label="tickets"><Tickets /></LazyRoute></ProtectedRoute>} />
          <Route path="/Quotes" element={<ProtectedRoute featureKey="quotes"><LazyRoute label="quotes"><Quotes /></LazyRoute></ProtectedRoute>} />
          <Route path="/SalesOrders" element={<ProtectedRoute featureKey="sales_orders"><LazyRoute label="sales orders"><SalesOrders /></LazyRoute></ProtectedRoute>} />
          <Route path="/SalesInvoices" element={<ProtectedRoute featureKey="sales_invoices"><LazyRoute label="sales invoices"><SalesInvoices /></LazyRoute></ProtectedRoute>} />
          <Route path="/PurchaseOrders" element={<ProtectedRoute featureKey="purchase_orders"><LazyRoute label="purchase orders"><PurchaseOrders /></LazyRoute></ProtectedRoute>} />
          <Route path="/PurchaseInvoices" element={<ProtectedRoute featureKey="purchase_invoices"><LazyRoute label="purchase invoices"><PurchaseInvoices /></LazyRoute></ProtectedRoute>} />
          <Route path="/Payments" element={<ProtectedRoute featureKey="payments"><LazyRoute label="payments"><Payments /></LazyRoute></ProtectedRoute>} />
          <Route path="/Reports" element={<ProtectedRoute featureKey="reports"><LazyRoute label="reports"><Reports /></LazyRoute></ProtectedRoute>} />
          <Route path="/EmailSettings" element={<ProtectedRoute featureKey="email_settings"><LazyRoute label="email settings"><EmailSettings /></LazyRoute></ProtectedRoute>} />
          <Route path="/UnmatchedEmails" element={<ProtectedRoute featureKey="unmatched_emails"><LazyRoute label="unmatched emails"><UnmatchedEmails /></LazyRoute></ProtectedRoute>} />
          <Route path="/AIAssistant" element={<ProtectedRoute featureKey="ai_assistant"><LazyRoute label="AI assistant"><AIAssistant /></LazyRoute></ProtectedRoute>} />
          <Route path="/Settings" element={<ProtectedRoute featureKey="settings"><LazyRoute label="settings"><Settings /></LazyRoute></ProtectedRoute>} />
          <Route path="/MyEmailSettings" element={<LazyRoute label="my email settings"><MyEmailSettings /></LazyRoute>} />
          <Route path="/LiveUsers" element={<LazyRoute label="live users"><LiveUsers /></LazyRoute>} />
          <Route path="/AIInteractionsHistory" element={<LazyRoute label="AI interactions"><AIInteractionsHistory /></LazyRoute>} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <PermissionsProvider>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </PermissionsProvider>
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  );
}

export default App;
