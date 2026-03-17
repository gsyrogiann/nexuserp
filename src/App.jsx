import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Customers" element={<Customers />} />
        <Route path="/Suppliers" element={<Suppliers />} />
        <Route path="/Products" element={<Products />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Quotes" element={<Quotes />} />
        <Route path="/SalesOrders" element={<SalesOrders />} />
        <Route path="/SalesInvoices" element={<SalesInvoices />} />
        <Route path="/PurchaseOrders" element={<PurchaseOrders />} />
        <Route path="/PurchaseInvoices" element={<PurchaseInvoices />} />
        <Route path="/Payments" element={<Payments />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/AIAssistant" element={<AIAssistant />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;