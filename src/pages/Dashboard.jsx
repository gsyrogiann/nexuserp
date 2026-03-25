import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import KPIGrid from '../components/dashboard/KPIGrid';
import SalesChart from '../components/dashboard/SalesChart';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import RecentActivity from '../components/dashboard/RecentActivity';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';

export default function Dashboard() {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const { data: salesInvoices = [] } = useQuery({
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
    queryFn: () => fetchList(base44.entities.ActivityLog, {
      limit: 20,
    }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Business overview and AI insights" />

      <KPIGrid
        customers={customers}
        products={products}
        salesInvoices={salesInvoices}
        purchaseInvoices={purchaseInvoices}
        payments={payments}
        salesOrders={salesOrders}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart invoices={salesInvoices} />
        </div>
        <AlertsPanel salesInvoices={salesInvoices} products={products} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIInsightsWidget
          customers={customers}
          salesInvoices={salesInvoices}
          products={products}
        />
        <RecentActivity logs={logs} />
      </div>
    </div>
  );
}
