import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertsPanel({ salesInvoices = [], products = [], stockMovements = [] }) {
  const alerts = [];

  // Overdue invoices
  const overdue = salesInvoices.filter(i => i.status === 'overdue');
  if (overdue.length > 0) {
    alerts.push({
      icon: Clock,
      color: 'text-red-500 bg-red-50',
      title: `${overdue.length} overdue invoice(s)`,
      detail: `Total: €${overdue.reduce((s, i) => s + (i.total || 0) - (i.paid_amount || 0), 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}`
    });
  }

  // Low stock (products with min_stock set, using simple heuristic)
  const lowStockProducts = products.filter(p => p.min_stock > 0 && p.status === 'active');
  if (lowStockProducts.length > 0) {
    alerts.push({
      icon: Package,
      color: 'text-amber-500 bg-amber-50',
      title: `${lowStockProducts.length} product(s) with stock rules`,
      detail: 'Check inventory levels'
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      icon: AlertTriangle,
      color: 'text-emerald-500 bg-emerald-50',
      title: 'All clear',
      detail: 'No critical alerts at this time'
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className={cn('p-1.5 rounded-lg', alert.color)}>
              <alert.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
