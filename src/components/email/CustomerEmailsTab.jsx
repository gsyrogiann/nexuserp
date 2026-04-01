import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmailMessageModal from './EmailMessageModal';
import { ArrowDownLeft, ArrowUpRight, Paperclip, Search, ChevronDown, ChevronRight, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function CustomerEmailsTab({ customerId }) {
  const [search, setSearch] = useState('');
  const [expandedThreads, setExpandedThreads] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [dirFilter, setDirFilter] = useState('all');

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ['email-threads', customerId],
    queryFn: () => base44.entities.EmailThread.filter({ customer_id: customerId }, '-last_message_at'),
    enabled: !!customerId,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['email-messages', customerId],
    queryFn: () => base44.entities.EmailMessage.filter({ customer_id: customerId }, '-sent_at'),
    enabled: !!customerId,
  });

  const toggleThread = (threadId) => {
    setExpandedThreads(prev => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  const filteredThreads = threads.filter(t => {
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase());
    const threadMessages = messages.filter(m => m.thread_id === t.id);
    const matchDir = dirFilter === 'all' || threadMessages.some(m => m.direction === dirFilter);
    return matchSearch && matchDir;
  });

  if (loadingThreads || loadingMessages) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
          <Search className="w-5 h-5" />
        </div>
        <p className="font-medium">Δεν υπάρχουν emails</p>
        <p className="text-sm mt-1">Τα emails θα εμφανιστούν εδώ μόλις γίνει sync.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση θέματος…" className="pl-8 h-8 text-sm" />
        </div>
        {['all','incoming','outgoing'].map(d => (
          <Button key={d} variant={dirFilter === d ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setDirFilter(d)}>
            {d === 'all' ? 'Όλα' : d === 'incoming' ? 'Εισερχόμενα' : 'Εξερχόμενα'}
          </Button>
        ))}
      </div>

      {/* AI placeholder */}
      <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary">AI Email Analysis <span className="text-muted-foreground font-normal">(Σύντομα)</span></p>
          <p className="text-[11px] text-muted-foreground">Σύνοψη συνομιλίας · Πρόθεση πελάτη · Πρόταση επόμενης απάντησης · Ανίχνευση επείγουσας επικοινωνίας</p>
        </div>
      </div>

      {/* Thread list */}
      <div className="space-y-2">
        {filteredThreads.map(thread => {
          const threadMsgs = messages
            .filter(m => m.thread_id === thread.id)
            .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
          const isExpanded = expandedThreads[thread.id];
          const latestMsg = threadMsgs[threadMsgs.length - 1];
          const hasIncoming = threadMsgs.some(m => m.direction === 'incoming');
          const hasOutgoing = threadMsgs.some(m => m.direction === 'outgoing');

          return (
            <div key={thread.id} className="border rounded-lg overflow-hidden bg-card">
              {/* Thread header */}
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                onClick={() => toggleThread(thread.id)}
              >
                <div className="mt-0.5 text-muted-foreground">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{thread.subject || '(no subject)'}</span>
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{threadMsgs.length} μηνύματα</span>
                    {hasIncoming && <Badge className="text-[10px] gap-1 bg-blue-50 text-blue-600 border-blue-200 border h-5"><ArrowDownLeft className="w-2.5 h-2.5" />Εισ.</Badge>}
                    {hasOutgoing && <Badge className="text-[10px] gap-1 bg-emerald-50 text-emerald-600 border-emerald-200 border h-5"><ArrowUpRight className="w-2.5 h-2.5" />Εξ.</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{thread.snippet}</p>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                  {thread.last_message_at ? format(new Date(thread.last_message_at), 'dd MMM', { locale: el }) : ''}
                </div>
              </button>

              {/* Messages */}
              {isExpanded && (
                <div className="border-t divide-y">
                  {threadMsgs.map(msg => (
                    <button
                      key={msg.id}
                      className="w-full text-left px-6 py-3 hover:bg-muted/20 transition-colors flex items-start gap-3"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      <div className="mt-0.5">
                        {msg.direction === 'incoming'
                          ? <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                          : <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{msg.sender_name || msg.sender_email}</span>
                          {msg.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{msg.snippet}</p>
                      </div>
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {msg.sent_at ? format(new Date(msg.sent_at), 'dd MMM HH:mm', { locale: el }) : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EmailMessageModal message={selectedMessage} open={!!selectedMessage} onClose={() => setSelectedMessage(null)} />
    </div>
  );
}
