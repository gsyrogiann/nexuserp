import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { listCustomers } from '@/lib/directoryQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { Mail, Link2, Search, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';
import { executeMutation, getErrorMessage } from '@/lib/mutationHelpers';

export default function UnmatchedEmails() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [linkDialog, setLinkDialog] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [linking, setLinking] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['unmatched-emails'],
    queryFn: () => base44.entities.UnmatchedEmail.filter({ review_status: 'pending' }, '-received_at'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => listCustomers(),
  });

  const filtered = emails.filter(e =>
    !search ||
    e.sender_email?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async () => {
    if (!selectedCustomer || !linkDialog) return;
    setLinking(true);
    try {
      await executeMutation(
        () => base44.functions.invoke('linkEmailToCustomer', {
          unmatched_email_id: linkDialog.id,
          customer_id: selectedCustomer,
        }),
        {
          actionLabel: 'link unmatched email',
          fallbackMessage: 'Δεν ήταν δυνατή η σύνδεση του email με πελάτη.',
          validate: () => {
            if (!linkDialog?.id || !selectedCustomer) {
              throw new Error('Λείπουν στοιχεία για τη σύνδεση του email.');
            }
          },
          audit: {
            action: 'link',
            target: 'unmatched_email',
            targetId: linkDialog.id,
            summary: 'Linked unmatched email to customer',
            metadata: {
              customerId: selectedCustomer,
              senderEmail: linkDialog.sender_email,
            },
          },
        }
      );
      toast.success('Email συνδέθηκε με τον πελάτη!');
      queryClient.invalidateQueries();
      setLinkDialog(null);
      setSelectedCustomer('');
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleIgnore = async (email) => {
    try {
      await executeMutation(
        () => base44.entities.UnmatchedEmail.update(email.id, { review_status: 'ignored' }),
        {
          actionLabel: 'ignore unmatched email',
          fallbackMessage: 'Δεν ήταν δυνατή η ενημέρωση του email.',
          audit: {
            action: 'ignore',
            target: 'unmatched_email',
            targetId: email.id,
            summary: 'Marked unmatched email as ignored',
            metadata: {
              senderEmail: email.sender_email,
            },
          },
          validate: () => {
            if (!email?.id) {
              throw new Error('Το email δεν έχει έγκυρο id.');
            }
          },
        }
      );
      queryClient.invalidateQueries();
      toast.success('Email σημειώθηκε ως αγνοημένο');
    } catch (error) {
      toast.error(`Σφάλμα: ${getErrorMessage(error, 'Δεν ήταν δυνατή η ενημέρωση του email.')}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Αναντίστοιχα Emails"
        subtitle={`${filtered.length} emails χωρίς αντιστοίχιση με πελάτη`}
        icon={AlertCircle}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση…" className="pl-9 h-9 text-sm" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Φόρτωση…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Δεν υπάρχουν αναντίστοιχα emails</p>
          <p className="text-sm text-muted-foreground mt-1">Όλα τα emails έχουν αντιστοιχιστεί.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(email => (
            <Card key={email.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium truncate">{email.subject || '(no subject)'}</span>
                    <Badge variant="outline" className="text-[10px]">{email.sync_source || 'gmail'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Από:</strong> {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
                  </p>
                  {email.snippet && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.snippet}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {email.received_at ? format(new Date(email.received_at), 'dd MMM yyyy HH:mm', { locale: el }) : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setLinkDialog(email); setSelectedCustomer(''); }}>
                    <Link2 className="w-3.5 h-3.5" /> Σύνδεση
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleIgnore(email)}>
                    Αγνόηση
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Link dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Σύνδεση με Πελάτη</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Email από: <strong>{linkDialog?.sender_email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Θέμα: <strong>{linkDialog?.subject}</strong>
            </p>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλογή πελάτη…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Ακύρωση</Button>
            <Button onClick={handleLink} disabled={!selectedCustomer || linking}>
              {linking ? 'Αποθήκευση…' : 'Σύνδεση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
