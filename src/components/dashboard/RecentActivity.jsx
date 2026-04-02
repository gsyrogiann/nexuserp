import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, ShoppingCart, CreditCard, Package, Users } from 'lucide-react';

const typeIcons = {
  SalesInvoice: FileText,
  SalesOrder: ShoppingCart,
  Payment: CreditCard,
  Product: Package,
  Customer: Users,
};

export default function RecentActivity({ logs }) {
  const recent = (logs || []).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
        )}
        {recent.map((log, i) => {
          const Icon = typeIcons[log.entity_type] || FileText;
          return (
            <div key={log.id || i} className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-muted mt-0.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {log.action} {log.entity_type?.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-xs text-muted-foreground truncate">{log.entity_label || log.details}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {log.created_date ? new Date(log.created_date).toLocaleString('el-GR') : ''}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
