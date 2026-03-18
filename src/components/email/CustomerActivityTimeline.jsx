import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, FileText, ShoppingCart, Receipt, CreditCard, StickyNote, Phone, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTIVITY_CONFIG = {
  email_received: { icon: ArrowDownLeft, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Email Εισερχόμενο' },
  email_sent: { icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Email Εξερχόμενο' },
  quote_sent: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Προσφορά' },
  order_created: { icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Παραγγελία' },
  invoice_created: { icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Τιμολόγιο' },
  payment_received: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100', label: 'Πληρωμή' },
  note_added: { icon: StickyNote, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Σημείωση' },
  call_logged: { icon: Phone, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Κλήση' },
};

const FILTERS = ['all', 'email_received', 'email_sent', 'quote_sent', 'order_created', 'invoice_created', 'payment_received'];

export default function CustomerActivityTimeline({ customerId }) {
  const [filter, setFilter] = useState('all');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['customer-activities', customerId],
    queryFn: () => base44.entities.CustomerActivity.filter({ customer_id: customerId }, '-occurred_at'),
    enabled: !!customerId,
  });

  const filtered = filter === 'all' ? activities : activities.filter(a => a.activity_type === filter);

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const cfg = ACTIVITY_CONFIG[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border text-muted-foreground'
              )}
            >
              {f === 'all' ? 'Όλα' : cfg?.label || f}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Δεν υπάρχει δραστηριότητα ακόμα</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1 pl-12">
            {filtered.map((activity, idx) => {
              const cfg = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.note_added;
              const Icon = cfg.icon;

              return (
                <div key={activity.id} className="relative">
                  {/* Dot */}
                  <div className={cn('absolute -left-[2.15rem] top-3 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background', cfg.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                  </div>

                  <div className="bg-card border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('text-[10px] border', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </Badge>
                          <span className="text-sm font-medium truncate">{activity.title}</span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {activity.occurred_at ? format(new Date(activity.occurred_at), 'dd MMM yyyy', { locale: el }) : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {activity.occurred_at ? formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true, locale: el }) : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}