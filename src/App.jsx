import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { PermissionsProvider, usePermissions } from '@/lib/usePermissions.jsx';
import { getFeatureKeyFromPath } from '@/lib/rbac';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Page imports
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Quotes from './pages/Quotes';
import SalesOrders from './pages/SalesOrders';
import SalesInvoices from './pages/SalesInvoices';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseInvoices from './pages/PurchaseInvoices';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import AIAssistant from './pages/AIAssistant';
import EmailSettings from './pages/EmailSettings';
import UnmatchedEmails from './pages/UnmatchedEmails';
import Tickets from './pages/Tickets';
import Calendar from './pages/Calendar';
import SalesPipeline from './pages/SalesPipeline';
import Settings from './pages/Settings.jsx';
import MyEmailSettings from './pages/MyEmailSettings';

/**
 * AccessDenied View
 * Εμφανίζεται όταν ένας μη-admin προσπαθεί να μπει σε κλειδωμένη σελίδα.
 */
const AccessDenied = () => (
  <div className="h-[80vh] flex flex-col items-center justify-center text-center p-6">
    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm">
      <Lock className="w-10 h-10 text-red-600" />
    </div>
    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Πρόσβαση Περιορισμένη</h2>
    <p className="text-slate-500 max-w-sm mt-2 text-sm font-medium">
      Δεν έχεις τα απαραίτητα δικαιώματα για αυτή την ενότητα.
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

// Permission-aware route guard
const ProtectedRoute = ({ featureKey, children }) => {
  const { canAccess, loading } = usePermissions();
  if (loading) return null;
  if (!canAccess(featureKey)) return <AccessDenied />;
  return children;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { loading: permLoading } = usePermissions();

  // Legacy admin check (kept for compatibility)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.is_super_admin || user?.email === 'georgesyro1925@gmail.com';

  if (isLoadingPublicSettings || isLoadingAuth || permLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Nexus Security Shield Active...
        </p>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Dashboard" replace />} />
      <Route element={<AppLayout />}>
        {/* RBAC-protected routes */}
        <Route path="/Dashboard"        element={<ProtectedRoute featureKey="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/Calendar"         element={<ProtectedRoute featureKey="calendar"><Calendar /></ProtectedRoute>} />
        <Route path="/Customers"        element={<ProtectedRoute featureKey="customers"><Customers /></ProtectedRoute>} />
        <Route path="/Suppliers"        element={<ProtectedRoute featureKey="suppliers"><Suppliers /></ProtectedRoute>} />
        <Route path="/SalesPipeline"    element={<ProtectedRoute featureKey="sales_pipeline"><SalesPipeline /></ProtectedRoute>} />
        <Route path="/Products"         element={<ProtectedRoute featureKey="products"><Products /></ProtectedRoute>} />
        <Route path="/Inventory"        element={<ProtectedRoute featureKey="inventory"><Inventory /></ProtectedRoute>} />
        <Route path="/Tickets"          element={<ProtectedRoute featureKey="tickets"><Tickets /></ProtectedRoute>} />
        <Route path="/Quotes"           element={<ProtectedRoute featureKey="quotes"><Quotes /></ProtectedRoute>} />
        <Route path="/SalesOrders"      element={<ProtectedRoute featureKey="sales_orders"><SalesOrders /></ProtectedRoute>} />
        <Route path="/SalesInvoices"    element={<ProtectedRoute featureKey="sales_invoices"><SalesInvoices /></ProtectedRoute>} />
        <Route path="/PurchaseOrders"   element={<ProtectedRoute featureKey="purchase_orders"><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/PurchaseInvoices" element={<ProtectedRoute featureKey="purchase_invoices"><PurchaseInvoices /></ProtectedRoute>} />
        <Route path="/Payments"         element={<ProtectedRoute featureKey="payments"><Payments /></ProtectedRoute>} />
        <Route path="/Reports"          element={<ProtectedRoute featureKey="reports"><Reports /></ProtectedRoute>} />
        <Route path="/EmailSettings"    element={<ProtectedRoute featureKey="email_settings"><EmailSettings /></ProtectedRoute>} />
        <Route path="/UnmatchedEmails"  element={<ProtectedRoute featureKey="unmatched_emails"><UnmatchedEmails /></ProtectedRoute>} />
        <Route path="/AIAssistant"      element={<ProtectedRoute featureKey="ai_assistant"><AIAssistant /></ProtectedRoute>} />
        <Route path="/Settings"         element={<ProtectedRoute featureKey="settings"><Settings /></ProtectedRoute>} />
        <Route path="/MyEmailSettings"  element={<MyEmailSettings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
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
  );
}

export default App;