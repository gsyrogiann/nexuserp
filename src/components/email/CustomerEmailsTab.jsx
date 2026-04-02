import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmailMessageModal from './EmailMessageModal';
import SendEmailDialog from './SendEmailDialog';
import { ArrowDownLeft, ArrowUpRight, Paperclip, Search, Send } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CustomerEmailsTab({ customerId, customer }) {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['email-messages', customerId],
    queryFn: () => base44.entities.EmailMessage.filter({ customer_id: customerId }, '-sent_at'),
    enabled: !!customerId,
  });

  const filtered = messages.filter((message) => {
    const matchDir = dirFilter === 'all' || message.direction === dirFilter;
    const matchSearch =
      !search ||
      message.subject?.toLowerCase().includes(search.toLowerCase()) ||
      message.snippet?.toLowerCase().includes(search.toLowerCase());
    return matchDir && matchSearch;
  });

  const handleSendClose = () => {
    setSendOpen(false);
    qc.invalidateQueries({ queryKey: ['email-messages', customerId] });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Αναζήτηση..." className="pl-8 h-8 text-sm" />
        </div>
        {['all', 'incoming', 'outgoing'].map((direction) => (
          <Button key={direction} variant={dirFilter === direction ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setDirFilter(direction)}>
            {direction === 'all' ? 'Όλα' : direction === 'incoming' ? 'Εισερχόμενα' : 'Εξερχόμενα'}
          </Button>
        ))}
        <Button size="sm" className="gap-1.5 rounded-xl font-bold h-8 ml-auto" onClick={() => setSendOpen(true)}>
          <Send className="w-3.5 h-3.5" /> Νέο Email
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground bg-slate-50 rounded-xl border-2 border-dashed">
          <Send className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">Δεν υπάρχουν emails</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className="w-full text-left"
            >
              <div className={cn(
                'rounded-xl border px-4 py-3 flex items-start gap-3 hover:shadow-md transition-all',
                message.direction === 'incoming'
                  ? 'bg-blue-50/50 border-blue-100 hover:border-blue-300'
                  : 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-300'
              )}>
                <div className={cn('mt-0.5 p-1.5 rounded-lg shrink-0',
                  message.direction === 'incoming' ? 'bg-blue-100' : 'bg-emerald-100'
                )}>
                  {message.direction === 'incoming'
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                    : <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Badge className={cn('text-[9px] font-black px-2 h-4 border shrink-0',
                      message.direction === 'incoming'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    )}>
                      {message.direction === 'incoming' ? 'ΕΙΣΕΡΧΟΜΕΝΟ' : 'ΕΞΕΡΧΟΜΕΝΟ'}
                    </Badge>
                    <span className="text-sm font-bold truncate text-slate-800">
                      {message.subject || '(χωρίς θέμα)'}
                    </span>
                    {message.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {message.direction === 'incoming'
                      ? `Από: ${message.sender_name || message.sender_email}`
                      : `Προς: ${(message.recipient_emails || []).join(', ')}`
                    }
                  </p>
                  {message.snippet && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{message.snippet}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-600">
                    {message.sent_at ? format(new Date(message.sent_at), 'dd MMM yyyy', { locale: el }) : ''}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {message.sent_at ? format(new Date(message.sent_at), 'HH:mm', { locale: el }) : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <EmailMessageModal message={selectedMessage} open={!!selectedMessage} onClose={() => setSelectedMessage(null)} />
      <SendEmailDialog open={sendOpen} onClose={handleSendClose} customer={customer} />
    </div>
  );
}
