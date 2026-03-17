import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import StatsCard from '../components/shared/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Package, FileText } from 'lucide-react';

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 55%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export default function Reports() {
  const { data: salesInvoices } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list(), initialData: [] });
  const { data: purchaseInvoices } = useQuery({ queryKey: ['purchaseInvoices'], queryFn: () => base44.entities.PurchaseInvoice.list(), initialData: [] });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list(), initialData: [] });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), initialData: [] });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list(), initialData: [] });

  const revenueByMonth = useMemo(() => {
    const months = {};
    salesInvoices.forEach(inv => {
      if (!inv.date) return;
      const month = new Date(inv.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[month] = (months[month] || 0) + (inv.total || 0);
    });
    return Object.entries(months).map(([month, total]) => ({ month, revenue: total }));
  }, [salesInvoices]);

  const topCustomers = useMemo(() => {
    const map = {};
    salesInvoices.forEach(inv => {
      if (inv.customer_name) map[inv.customer_name] = (map[inv.customer_name] || 0) + (inv.total || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [salesInvoices]);

  const statusBreakdown = useMemo(() => {
    const map = {};
    salesInvoices.forEach(inv => {
      const s = inv.status || 'draft';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [salesInvoices]);

  const totalRevenue = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalExpenses = purchaseInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Business performance overview" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard label="Revenue" value={`€${totalRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} />
        <StatsCard label="Expenses" value={`€${totalExpenses.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={FileText} />
        <StatsCard label="Gross Profit" value={`€${grossProfit.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} trend={grossProfit >= 0 ? 'up' : 'down'} />
        <StatsCard label="Customers" value={customers.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Month</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [`€${v.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={v => [`€${v.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`, 'Revenue']} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Invoice Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Payment Cash Flow</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No payment data yet</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payments.slice(0, 20).map(p => ({ date: p.date, amount: p.amount || 0, type: p.type }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}