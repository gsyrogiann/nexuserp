import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { listCustomers } from '@/lib/directoryQueries';
import { calculateDashboardStats, getDashboardAIAdvice } from '@/lib/dashboardHelpers';
import { reportOperationalEvent } from '@/lib/observability';
import PageHeader from '../components/shared/PageHeader';
import KPIGrid from '../components/dashboard/KPIGrid';
import SalesChart from '../components/dashboard/SalesChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import RecentActivity from '../components/dashboard/RecentActivity';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';
import { 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  BrainCircuit, 
  Quote, 
  MessageSquareMore,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DASHBOARD_STALE_TIME_MS = 60 * 1000;
const DASHBOARD_SECONDARY_DELAY_MS = 250;

async function fetchDashboardCoreData() {
  reportOperationalEvent('dashboard_data_start', { phase: 'core' });

  const [customers, products, salesInvoices] = await Promise.all([
    listCustomers({ entityName: 'dashboard_customer' }),
    fetchList(base44.entities.Product, { entityName: 'dashboard_product' }),
    fetchList(base44.entities.SalesInvoice, { entityName: 'dashboard_sales_invoice' }),
  ]);

  return { customers, products, salesInvoices };
}

async function fetchDashboardSecondaryData() {
  reportOperationalEvent('dashboard_data_start', { phase: 'secondary' });

  const [purchaseInvoices, payments, salesOrders] = await Promise.all([
    fetchList(base44.entities.PurchaseInvoice, { entityName: 'dashboard_purchase_invoice' }),
    fetchList(base44.entities.Payment, { entityName: 'dashboard_payment' }),
    fetchList(base44.entities.SalesOrder, { entityName: 'dashboard_sales_order' }),
  ]);

  return { purchaseInvoices, payments, salesOrders };
}

async function fetchDashboardAggregates() {
  const res = await base44.functions.invoke('getDashboardStats', {});
  return res?.data || {};
}

export default function Dashboard() {
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [enableSecondaryData, setEnableSecondaryData] = useState(false);
  const coreReadyLoggedRef = useRef(false);
  const secondaryReadyLoggedRef = useRef(false);

  const {
    data: coreData,
    isLoading: isLoadingCore,
    isError: isCoreError,
    error: coreError,
    refetch: refetchCore,
    isSuccess: isCoreSuccess,
  } = useQuery({
    queryKey: ['dashboard', 'core'],
    queryFn: fetchDashboardCoreData,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  const {
    data: secondaryData,
    isFetching: isFetchingSecondary,
    refetch: refetchSecondary,
    isSuccess: isSecondarySuccess,
  } = useQuery({
    queryKey: ['dashboard', 'secondary'],
    queryFn: fetchDashboardSecondaryData,
    staleTime: DASHBOARD_STALE_TIME_MS,
    enabled: enableSecondaryData,
  });

  const { data: dashboardAggregates } = useQuery({
    queryKey: ['dashboard', 'aggregates'],
    queryFn: fetchDashboardAggregates,
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!isCoreSuccess) {
      setEnableSecondaryData(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEnableSecondaryData(true);
    }, DASHBOARD_SECONDARY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isCoreSuccess]);

  useEffect(() => {
    if (!isCoreSuccess || coreReadyLoggedRef.current) {
      return;
    }

    coreReadyLoggedRef.current = true;
    reportOperationalEvent('dashboard_data_ready', { phase: 'core' });
  }, [isCoreSuccess]);

  useEffect(() => {
    if (!isSecondarySuccess || secondaryReadyLoggedRef.current) {
      return;
    }

    secondaryReadyLoggedRef.current = true;
    reportOperationalEvent('dashboard_data_ready', { phase: 'secondary' });
  }, [isSecondarySuccess]);

  const customers = coreData?.customers || [];
  const products = coreData?.products || [];
  const salesInvoices = coreData?.salesInvoices || [];
  const purchaseInvoices = secondaryData?.purchaseInvoices || [];
  const payments = secondaryData?.payments || [];
  const salesOrders = secondaryData?.salesOrders || [];
  const logs = dashboardAggregates?.recentActivity || [];

  // Κεντρικός υπολογισμός στατιστικών
  const stats = useMemo(() => {
    return calculateDashboardStats({
      customers,
      products,
      salesInvoices,
      purchaseInvoices,
      payments,
      salesOrders,
    });
  }, [customers, products, salesInvoices, purchaseInvoices, payments, salesOrders]);

  const kpiStats = useMemo(() => {
    if (dashboardAggregates?.stats) {
      return dashboardAggregates.stats;
    }

    return {
      totalCustomers: customers.length,
      totalRevenue: salesInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      totalExpenses: purchaseInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      totalPayments: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      totalOrders: salesOrders.length,
      lowStockProducts: products.filter((product) => Number(product.stock_quantity || 0) <= Number(product.min_stock || 0)).length,
    };
  }, [customers.length, dashboardAggregates?.stats, payments, products, purchaseInvoices, salesInvoices, salesOrders.length]);

  // Χειροκίνητη κλήση του AI CFO
  const handleGetAdvice = async () => {
    setIsExpanded(true);
    if (!aiAdvice) {
      setIsAiLoading(true);
      const advice = await getDashboardAIAdvice(stats);
      setAiAdvice(advice);
      setIsAiLoading(false);
    }
  };

  if (isCoreError) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Δεν φορτώθηκαν τα βασικά δεδομένα του Dashboard</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          {coreError?.message || 'Το αρχικό dashboard load απέτυχε. Μπορείς να ξαναδοκιμάσεις χωρίς να μείνει η εφαρμογή σε μόνιμο loading.'}
        </p>
        <Button className="mt-6 rounded-xl" onClick={() => {
          coreReadyLoggedRef.current = false;
          secondaryReadyLoggedRef.current = false;
          void refetchCore();
          void refetchSecondary();
        }}>
          Retry Dashboard Load
        </Button>
      </div>
    );
  }

  if (isLoadingCore) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 font-mono">Nexus Data Syncing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Επισκόπηση Επιχείρησης" 
          subtitle="Συνολική εικόνα και AI αναλύσεις σε πραγματικό χρόνο" 
        />
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-[11px] font-black text-blue-700 uppercase italic">
            {isFetchingSecondary ? 'Loading secondary data' : 'Live Nexus Stats'}
          </span>
        </div>
      </div>

      {/* --- INTERACTIVE AI CFO PANEL --- */}
      <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2.5rem] p-6 text-white shadow-2xl border border-white/10 transition-all duration-500 ease-in-out ${isExpanded ? 'min-h-[280px]' : 'min-h-[120px]'}`}>
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <BrainCircuit className="w-24 h-24" />
        </div>
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[1.5rem] border border-white/20">
                <BrainCircuit className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-200/70 font-mono italic">AI CFO Advisor</h3>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-tighter">Real-time analysis active</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm text-center">
                  <p className="text-[8px] font-black uppercase text-blue-300 mb-1">Profit Margin</p>
                  <p className="text-xl font-black italic">{stats.profitMargin}%</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm text-center">
                  <p className="text-[8px] font-black uppercase text-blue-300 mb-1">VAT to Pay</p>
                  <p className="text-xl font-black italic">€{Math.round(stats.vatToPay)}</p>
                </div>
              </div>

              <Button 
                onClick={isExpanded ? () => setIsExpanded(false) : handleGetAdvice}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-6 font-bold h-12 gap-2 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
              >
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isExpanded ? <X className="w-4 h-4" /> : <MessageSquareMore className="w-4 h-4" />)}
                {isExpanded ? 'Κλείσιμο' : 'Λήψη Συμβουλής'}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-6 border-t border-white/10 animate-in slide-in-from-top-4 duration-500">
               {isAiLoading ? (
                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <p className="text-lg font-medium italic text-slate-300">Προετοιμασία στρατηγικής ανάλυσης...</p>
                 </div>
               ) : (
                 <div className="flex gap-4 p-5 bg-white/5 rounded-3xl border border-white/5 relative group shadow-inner">
                    <Quote className="w-10 h-10 text-blue-500 opacity-20 shrink-0" />
                    <p className="text-xl font-bold leading-relaxed tracking-tight text-white italic">
                      {aiAdvice || "Απαιτούνται περισσότερα δεδομένα για την παραγωγή συμβουλής."}
                    </p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      <KPIGrid stats={kpiStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="p-4 flex items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-black text-sm uppercase tracking-tighter italic">Τάσεις Πωλήσεων</h3>
          </div>
          <SalesChart invoices={salesInvoices} />
        </div>
        
        <div className="h-full">
          <AlertsPanel salesInvoices={salesInvoices} products={products} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative group">
           <div className="absolute -top-2 -right-2 z-10 bg-blue-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
           </div>
           <AIInsightsWidget
              customers={customers}
              salesInvoices={salesInvoices}
              products={products}
            />
        </div>
        
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-tighter italic">Πρόσφατη Δραστηριότητα</h3>
              <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold text-slate-500 uppercase">Last 20 events</span>
           </div>
           <RecentActivity logs={logs} />
        </div>
      </div>
    </div>
  );
}
