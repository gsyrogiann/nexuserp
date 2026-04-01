import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  FileText, CreditCard, Ticket, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { executeMutation } from '@/lib/mutationHelpers';

const DAYS = ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'];
const MONTHS = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];

function getEventColor(type) {
  const map = {
    quote: 'bg-blue-500',
    sales_order: 'bg-green-500',
    sales_invoice: 'bg-emerald-600',
    payment: 'bg-purple-500',
    ticket: 'bg-yellow-500',
    email: 'bg-indigo-600', // Χρώμα για τα Emails
  };
  return map[type] || 'bg-gray-400';
}

function getEventIcon(type) {
  if (type === 'email') return <Mail className="w-3 h-3" />;
  if (type === 'ticket') return <Ticket className="w-3 h-3" />;
  if (type === 'payment') return <CreditCard className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(today.toISOString().slice(0, 10));

  // Queries - Χρησιμοποιούμε μόνο οντότητες που υπάρχουν στη βάση σου
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list() });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.ServiceTicket.list() });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => base44.entities.SalesOrder.list() });
  const { data: sentEmails = [] } = useQuery({ queryKey: ['sentEmails'], queryFn: () => base44.entities.EmailMessage.list() });

  // Mutation για το Drag & Drop (Ενημέρωση ημερομηνίας στα Tickets)
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, date }) => executeMutation(
      () => base44.entities.ServiceTicket.update(id, { due_date: date }),
      {
        actionLabel: 'update ticket due date',
        fallbackMessage: 'Δεν ήταν δυνατή η ενημέρωση της ημερομηνίας του ticket.',
        validate: () => {
          if (!id || !date) {
            throw new Error('Λείπει ticket ή ημερομηνία για το drag & drop.');
          }
        },
      }
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success("Η ημερομηνία του Ticket ενημερώθηκε");
    },
    meta: {
      title: 'Αποτυχία ενημέρωσης ticket',
      fallbackMessage: 'Δεν ήταν δυνατή η ενημέρωση της ημερομηνίας του ticket.',
    },
  });

  // Επεξεργασία και ενοποίηση όλων των events
  /** @type {any[]} */
  const allEvents = [
    ...quotes.map(e => ({ ...e, _type: 'quote', _date: e.date || e.created_date, _label: e.quote_number || 'Προσφορά', _color: 'bg-blue-500' })),
    ...tickets.map(e => ({ ...e, _type: 'ticket', _date: e.due_date || e.created_date, _label: e.title || 'Ticket', _color: 'bg-yellow-500' })),
    ...salesOrders.map(e => ({ ...e, _type: 'sales_order', _date: e.order_date || e.created_date, _label: e.order_number || 'Order', _color: 'bg-green-500' })),
    ...sentEmails.map(e => ({ 
      ...e, 
      _type: 'email', 
      _date: e.sent_at || e.created_date, 
      _label: e.subject || 'Email', 
      _color: 'bg-indigo-600' 
    })),
  ].filter(e => e._date);

  const eventsOnDate = (dateStr) => allEvents.filter(e => e._date && e._date.slice(0, 10) === dateStr);
  const selectedEvents = eventsOnDate(selected);

  // Drag and Drop Logic
  const handleDragStart = (e, eventId, type) => {
    e.dataTransfer.setData("eventId", eventId);
    e.dataTransfer.setData("eventType", type);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    const eventType = e.dataTransfer.getData("eventType");
    
    // Επιτρέπουμε Drag & Drop μόνο στα Tickets προς το παρόν
    if (eventId && eventType === 'ticket') {
      updateTicketMutation.mutate({ id: eventId, date: targetDate });
    } else if (eventId) {
      toast.info("Το Drag & Drop υποστηρίζεται προς το παρόν μόνο για τα Tickets.");
    }
  };

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-primary" /> Ημερολόγιο
          </h1>
          <p className="text-muted-foreground text-sm">Επισκόπηση ενεργειών & επικοινωνιών</p>
        </div>
        <Button variant="outline" onClick={() => setSelected(today.toISOString().slice(0, 10))}>Σήμερα</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="border-none shadow-xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">{MONTHS[current.month]} {current.year}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                {DAYS.map(d => (
                  <div key={d} className="bg-slate-50 py-3 text-center text-[10px] font-black uppercase text-slate-400">
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="bg-white/50 h-32" />;
                  const dateStr = `${current.year}-${String(current.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayEvents = eventsOnDate(dateStr);
                  const isSelected = dateStr === selected;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelected(dateStr)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={cn(
                        "bg-white h-32 p-2 transition-all cursor-pointer relative group border-r border-b border-slate-50",
                        isSelected && "bg-blue-50/30 ring-2 ring-primary ring-inset z-10"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold",
                        dateStr === today.toISOString().slice(0, 10) ? "text-blue-600 font-black" : "text-slate-400"
                      )}>
                        {day}
                      </span>
                      
                      <div className="mt-1 space-y-1">
                        {dayEvents.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            draggable={ev._type === 'ticket'}
                            onDragStart={(e) => handleDragStart(e, ev.id, ev._type)}
                            className={cn(
                              "text-[9px] p-1.5 rounded-lg text-white font-bold flex items-center gap-1.5 truncate shadow-sm",
                              ev._color,
                              ev._type === 'ticket' && "hover:scale-105 transition-transform"
                            )}
                          >
                            {getEventIcon(ev._type)}
                            <span className="truncate">{ev._label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Επιλεγμένη Ημέρα</p>
              <CardTitle className="text-base font-bold">
                {new Date(selected).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="py-10 text-center opacity-30 italic text-sm text-slate-400">
                  Καμία δραστηριότητα
                </div>
              ) : (
                selectedEvents.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1">
                    <Badge className={cn("text-[8px] w-fit font-black border-none", ev._color)}>
                      {ev._type.toUpperCase()}
                    </Badge>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{ev._label}</p>
                    {(ev.description || ev.body) && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                        "{ev.description || ev.body}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-slate-900 text-white">
            <CardHeader><CardTitle className="text-xs uppercase font-black text-slate-400">Υπόμνημα</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <div className="w-2 h-2 rounded-full bg-indigo-600" /> Emails (Sent)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Tickets
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Προσφορές
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
