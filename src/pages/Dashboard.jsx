import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { calculateDashboardStats } from '@/lib/dashboardHelpers';
import PageHeader from '../components/shared/PageHeader';
import KPIGrid from '../components/dashboard/KPIGrid';
import SalesChart from '../components/dashboard/SalesChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import RecentActivity from '../components/dashboard/RecentActivity';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';
import { Loader2, Sparkles, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  // Φόρτωση όλων των δεδομένων με fetchList (No more 50 limit)
  const { data: customers = [], isLoading: loadingCust } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  const { data: products = [], isLoading: loadingProd } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const { data: salesInvoices = [], isLoading: loadingSales } = useQuery({
    queryKey: ['salesInvoices'],
    queryFn: () => fetchList(base44.entities.SalesInvoice),
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['purchaseInvoices'],
    queryFn: () => fetchList(base44.entities.PurchaseInvoice),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => fetchList(base44.entities.Payment),
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => fetchList(base44.entities.SalesOrder),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => fetchList(base44.entities.ActivityLog, { limit: 20 }),
  });

  // Κεντρικός υπολογισμός στατιστικών με useMemo για ταχύτητα
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

  const isInitialLoading = loadingCust || loadingProd || loadingSales;

  if (isInitialLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nexus Data Syncing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Επισκόπηση Επιχείρησης" 
          subtitle="Συνολική εικόνα και AI αναλύσεις σε πραγματικό χρόνο" 
        />
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-[11px] font-black text-blue-700 uppercase italic">Live Nexus Stats</span>
        </div>
      </div>

      {/* KPI Cards: Πλέον δείχνουν τα ΠΡΑΓΜΑΤΙΚΑ σύνολα */}
      <KPIGrid stats={stats} />

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
        {/* Το AI Insight Widget πλέον βλέπει όλα τα δεδομένα για να προτείνει tiers */}
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
