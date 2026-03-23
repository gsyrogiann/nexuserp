import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, FileText, ShoppingCart, CreditCard, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const MONTHS = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];

function getEventColor(type) {
  const map = {
    quote: 'bg-blue-500',
    sales_order: 'bg-green-500',
    sales_invoice: 'bg-emerald-600',
    purchase_order: 'bg-orange-500',
    purchase_invoice: 'bg-red-500',
    payment: 'bg-purple-500',
    ticket: 'bg-yellow-500',
  };
  return map[type] || 'bg-gray-400';
}

function getEventIcon(type) {
  if (type === 'ticket') return <Ticket className="w-3 h-3" />;
  if (type === 'payment') return <CreditCard className="w-3 h-3" />;
  if (type === 'sales_order' || type === 'purchase_order') return <ShoppingCart className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(today.toISOString().slice(0, 10));

  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list() });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => base44.entities.SalesOrder.list() });
  const { data: salesInvoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list() });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['purchaseOrders'], queryFn: () => base44.entities.PurchaseOrder.list() });
  const { data: purchaseInvoices = [] } = useQuery({ queryKey: ['purchaseInvoices'], queryFn: () => base44.entities.PurchaseInvoice.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.ServiceTicket.list() });

  const allEvents = [
    ...quotes.map(e => ({ ...e, _type: 'quote', _date: e.date || e.created_date, _label: e.quote_number || 'Quote', _color: 'bg-blue-500' })),
    ...salesOrders.map(e => ({ ...e, _type: 'sales_order', _date: e.order_date || e.created_date, _label: e.order_number || 'Sales Order', _color: 'bg-green-500' })),
    ...salesInvoices.map(e => ({ ...e, _type: 'sales_invoice', _date: e.invoice_date || e.created_date, _label: e.invoice_number || 'Sales Invoice', _color: 'bg-emerald-600' })),
    ...purchaseOrders.map(e => ({ ...e, _type: 'purchase_order', _date: e.order_date || e.created_date, _label: e.order_number || 'Purchase Order', _color: 'bg-orange-500' })),
    ...purchaseInvoices.map(e => ({ ...e, _type: 'purchase_invoice', _date: e.invoice_date || e.created_date, _label: e.invoice_number || 'Purchase Invoice', _color: 'bg-red-500' })),
    ...payments.map(e => ({ ...e, _type: 'payment', _date: e.payment_date || e.created_date, _label: e.reference || 'Payment', _color: 'bg-purple-500' })),
    ...tickets.map(e => ({ ...e, _type: 'ticket', _date: e.due_date || e.created_date, _label: e.title || 'Ticket', _color: 'bg-yellow-500' })),
  ].filter(e => e._date);

  const eventsOnDate = (dateStr) => allEvents.filter(e => e._date && e._date.slice(0, 10) === dateStr);
  const selectedEvents = eventsOnDate(selected);

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  const goToday = () => { setCurrent({ year: today.getFullYear(), month: today.getMonth() }); setSelected(today.toISOString().slice(0, 10)); };

  const typeLabel = { quote: 'Προσφορά', sales_order: 'Παραγγελία', sales_invoice: 'Τιμολόγιο Πώλησης', purchase_order: 'Παραγγελία Αγοράς', purchase_invoice: 'Τιμολόγιο Αγοράς', payment: 'Πληρωμή', ticket: 'Ticket' };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ημερολόγιο</h1>
          <p className="text-muted-foreground text-sm">Επισκόπηση δραστηριοτήτων</p>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}><CalendarIcon className="w-4 h-4 mr-2" />Σήμερα</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <CardTitle className="text-lg">{MONTHS[current.month]} {current.year}</CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dateStr = `${current.year}-${String(current.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayEvents = eventsOnDate(dateStr);
                  const isToday = dateStr === today.toISOString().slice(0, 10);
                  const isSelected = dateStr === selected;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelected(dateStr)}
                      className={cn(
                        'min-h-[60px] p-1 rounded-lg border text-left transition-all',
                        isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-transparent hover:border-border hover:bg-muted/50',
                        isToday && !isSelected ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' : ''
                      )}
                    >
                      <span className={cn('text-xs font-medium block mb-1', isToday ? 'text-blue-600 font-bold' : 'text-foreground')}>{day}</span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev, idx) => (
                          <div key={idx} className={cn('text-white text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 truncate', ev._color)}>
                            {getEventIcon(ev._type)}
                            <span className="truncate">{ev._label}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} ακόμα</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Events */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {new Date(selected + 'T00:00:00').toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Δεν υπάρχουν δραστηριότητες
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-white flex-shrink-0 mt-0.5', ev._color)}>
                        {getEventIcon(ev._type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ev._label}</p>
                        <p className="text-xs text-muted-foreground">{typeLabel[ev._type]}</p>
                        {ev.customer && <p className="text-xs text-muted-foreground truncate">{typeof ev.customer === 'string' ? ev.customer : ''}</p>}
                      </div>
                      {ev.status && (
                        <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">{ev.status}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly summary */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Σύνοψη Μήνα</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(typeLabel).map(([type, label]) => {
                const count = allEvents.filter(e => e._type === type && e._date && e._date.startsWith(`${current.year}-${String(current.month + 1).padStart(2,'0')}`)).length;
                if (!count) return null;
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2.5 h-2.5 rounded-full', getEventColor(type))} />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
