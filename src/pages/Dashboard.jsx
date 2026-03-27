import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { calculateDashboardStats, getDashboardAIAdvice } from '@/lib/dashboardHelpers';
import PageHeader from '../components/shared/PageHeader';
import KPIGrid from '../components/dashboard/KPIGrid';
import SalesChart from '../components/dashboard/SalesChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import RecentActivity from '../components/dashboard/RecentActivity';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';
import { Loader2, Sparkles, TrendingUp, BrainCircuit, Quote } from 'lucide-react';

export default function Dashboard() {
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // Ενεργοποίηση του AI CFO Advice
  useEffect(() => {
    async function fetchAdvice() {
      // Καλούμε το AI μόνο αν έχουμε δεδομένα και δεν έχουμε ήδη συμβουλή
      if (stats.netRevenue > 0 && !aiAdvice) {
        setIsAiLoading(true);
        const advice = await getDashboardAIAdvice(stats);
        setAiAdvice(advice);
        setIsAiLoading(false);
      }
    }
    fetchAdvice();
  }, [stats, aiAdvice]);

  const isInitialLoading = loadingCust || loadingProd || loadingSales;

  if (isInitialLoading) {
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
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-[11px] font-black text-blue-700 uppercase italic tracking-tighter">Nexus AI CFO Active</span>
        </div>
      </div>

      {/* --- AI CFO STRATEGIC ADVICE PANEL --- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <BrainCircuit className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="p-5 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-inner">
            <BrainCircuit className="w-10 h-10 text-blue-300" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200/70 font-mono">Strategic CFO Insight</h3>
            </div>
            
            {isAiLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <p className="text-lg font-medium italic text-slate-300">Αναλύω τα οικονομικά σας δεδομένα...</p>
              </div>
            ) : (
              <div className="flex gap-4">
                <Quote className="w-8 h-8 text-blue-500 opacity-30 shrink-0 hidden md:block" />
                <p className="text-xl font-bold leading-tight tracking-tight text-white italic">
                  {aiAdvice || "Το AI προετοιμάζει την ανάλυση για τη βελτιστοποίηση των κερδών σας."}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 min-w-[200px]">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase text-blue-300 mb-1">Profit Margin</p>
              <p className="text-2xl font-black italic">{stats.profitMargin}%</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase text-blue-300 mb-1">VAT to Pay</p>
              <p className="text-2xl font-black italic">€{Math.round(stats.vatToPay)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
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
