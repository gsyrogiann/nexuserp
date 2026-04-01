import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import { canUserAccess, isAdminUser } from '@/lib/permissions';
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
import Settings from './pages/Settings'; // <--- ΝΕΟ IMPORT

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
      Αυτή η ενότητα του Nexus ERP είναι διαθέσιμη μόνο σε λογαριασμούς με δικαιώματα διαχειριστή.
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

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  const isAdmin = isAdminUser(user);

  if (isLoadingPublicSettings || isLoadingAuth) {
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
        {/* ΕΛΕΥΘΕΡΕΣ ΔΙΑΔΡΟΜΕΣ */}
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Customers" element={<Customers />} />
        <Route path="/Suppliers" element={<Suppliers />} />
        <Route path="/Products" element={<Products />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Tickets" element={<Tickets />} />
        <Route path="/Calendar" element={<Calendar />} />
        <Route path="/SalesPipeline" element={<SalesPipeline />} />
        <Route path="/Quotes" element={<Quotes />} />
        <Route path="/SalesOrders" element={<SalesOrders />} />
        <Route path="/PurchaseOrders" element={<PurchaseOrders />} />
        <Route path="/UnmatchedEmails" element={<UnmatchedEmails />} />

        {/* ΠΡΟΣΤΑΤΕΥΜΕΝΕΣ ΔΙΑΔΡΟΜΕΣ */}
        <Route path="/SalesInvoices" element={canUserAccess(user, '/SalesInvoices') ? <SalesInvoices /> : <AccessDenied />} />
        <Route path="/PurchaseInvoices" element={canUserAccess(user, '/PurchaseInvoices') ? <PurchaseInvoices /> : <AccessDenied />} />
        <Route path="/Payments" element={canUserAccess(user, '/Payments') ? <Payments /> : <AccessDenied />} />
        <Route path="/Reports" element={canUserAccess(user, '/Reports') ? <Reports /> : <AccessDenied />} />
        <Route path="/AIAssistant" element={canUserAccess(user, '/AIAssistant') ? <AIAssistant /> : <AccessDenied />} />
        <Route path="/EmailSettings" element={canUserAccess(user, '/EmailSettings') ? <EmailSettings /> : <AccessDenied />} />
        <Route path="/Settings" element={canUserAccess(user, '/Settings') ? <Settings /> : <AccessDenied />} /> {/* <--- ΑΝΤΙΚΑΤΑΣΤΑΣΗ VOIP SETTINGS */}
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
