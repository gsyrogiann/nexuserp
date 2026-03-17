import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import StatsCard from '../components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Users, FileText, CreditCard } from 'lucide-react';
import { subMonths, isAfter, parseISO, format } from 'date-fns';

const COLORS = [
  'hsl(221,83%,53%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)',
  'hsl(280,65%,60%)', 'hsl(340,75%,55%)'
];

const fmt = (v) => `€${(v || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}`;

export default function Reports() {
  const [period, setPeriod] = useState('12');

  const { data: salesInvoices } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list(), initialData: [] });
  const { data: purchaseInvoices } = useQuery({ queryKey: ['purchaseInvoices'], queryFn: () => base44.entities.PurchaseInvoice.list(), initialData: [] });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list(), initialData: [] });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list(), initialData: [] });

  const cutoff = useMemo(() => subMonths(new Date(), parseInt(period)), [period]);

  const filteredSales = useMemo(() =>
    salesInvoices.filter(i => i.date && isAfter(parseISO(i.date), cutoff)),
    [salesInvoices, cutoff]
  );

  const filteredPurchases = useMemo(() =>
    purchaseInvoices.filter(i => i.date && isAfter(parseISO(i.date), cutoff)),
    [purchaseInvoices, cutoff]
  );

  const filteredPayments = useMemo(() =>
    payments.filter(p => p.date && isAfter(parseISO(p.date), cutoff)),
    [payments, cutoff]
  );

  const totalRevenue = useMemo(() => filteredSales.reduce((s, i) => s + (i.total || 0), 0), [filteredSales]);
  const totalExpenses = useMemo(() => filteredPurchases.reduce((s, i) => s + (i.total || 0), 0), [filteredPurchases]);
  const grossProfit = totalRevenue - totalExpenses;
  const collected = useMemo(() =>
    filteredPayments.filter(p => p.type === 'incoming' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0),
    [filteredPayments]
  );

  // Revenue vs Expenses by month
  const revenueByMonth = useMemo(() => {
    const map = {};
    filteredSales.forEach(inv => {
      if (!inv.date) return;
      const key = format(parseISO(inv.date), 'MMM yy');
      if (!map[key]) map[key] = { month: key, revenue: 0, expenses: 0 };
      map[key].revenue += inv.total || 0;
    });
    filteredPurchases.forEach(inv => {
      if (!inv.date) return;
      const key = format(parseISO(inv.date), 'MMM yy');
      if (!map[key]) map[key] = { month: key, revenue: 0, expenses: 0 };
      map[key].expenses += inv.total || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSales, filteredPurchases]);

  const topCustomers = useMemo(() => {
    const map = {};
    filteredSales.forEach(inv => {
      if (inv.customer_name) map[inv.customer_name] = (map[inv.customer_name] || 0) + (inv.total || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value }));
  }, [filteredSales]);

  const invoiceStatusData = useMemo(() => {
    const map = {};
    filteredSales.forEach(inv => { const s = inv.status || 'draft'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [filteredSales]);

  const cashFlowData = useMemo(() => {
    const map = {};
    filteredPayments.forEach(p => {
      if (!p.date) return;
      const key = format(parseISO(p.date), 'MMM yy');
      if (!map[key]) map[key] = { month: key, incoming: 0, outgoing: 0 };
      if (p.type === 'incoming' && p.status === 'completed') map[key].incoming += p.amount || 0;
      if (p.type === 'outgoing' && p.status === 'completed') map[key].outgoing += p.amount || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Business performance overview">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 2 years</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Revenue" value={fmt(totalRevenue)} icon={TrendingUp} />
        <StatsCard label="Expenses" value={fmt(totalExpenses)} icon={FileText} />
        <StatsCard label="Gross Profit" value={fmt(grossProfit)} icon={TrendingUp} trend={grossProfit >= 0 ? 'up' : 'down'} />
        <StatsCard label="Collected" value={fmt(collected)} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {revenueByMonth.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [fmt(v)]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {topCustomers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sales Invoice Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {invoiceStatusData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No invoices for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {invoiceStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Cash Flow (Payments)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {cashFlowData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No payment data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [fmt(v)]} />
                    <Legend />
                    <Line type="monotone" dataKey="incoming" name="Incoming" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="outgoing" name="Outgoing" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}