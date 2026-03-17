import React from 'react';
import StatsCard from '../shared/StatsCard';
import { Users, Package, FileText, CreditCard, TrendingUp, AlertTriangle, ShoppingCart, Truck } from 'lucide-react';

export default function KPIGrid({ customers, products, salesInvoices, purchaseInvoices, payments, salesOrders }) {
  const totalRevenue = (salesInvoices || []).reduce((s, i) => s + (i.total || 0), 0);
  const totalReceivables = (salesInvoices || []).filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + ((i.total || 0) - (i.paid_amount || 0)), 0);
  const totalPayables = (purchaseInvoices || []).filter(i => i.status !== 'paid').reduce((s, i) => s + ((i.total || 0) - (i.paid_amount || 0)), 0);
  const overdueInvoices = (salesInvoices || []).filter(i => i.status === 'overdue').length;
  const activeOrders = (salesOrders || []).filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const thisMonthPayments = (payments || []).filter(p => p.type === 'incoming' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard label="Total Revenue" value={`€${totalRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} change="+12.3% vs last month" trend="up" />
      <StatsCard label="Receivables" value={`€${totalReceivables.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={CreditCard} change={`${overdueInvoices} overdue`} trend={overdueInvoices > 0 ? 'down' : 'up'} />
      <StatsCard label="Payables" value={`€${totalPayables.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={Truck} />
      <StatsCard label="Active Orders" value={activeOrders} icon={ShoppingCart} change={`${(customers || []).length} customers`} />
    </div>
  );
}