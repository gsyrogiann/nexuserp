import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailSettings() {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: syncState = [] } = useQuery({
    queryKey: ['sync-state'],
    queryFn: () => base44.entities.SyncState.list(),
  });

  const { data: messageCount } = useQuery({
    queryKey: ['email-message-count'],
    queryFn: () => base44.entities.EmailMessage.list(),
    select: d => d.length,
  });

  const { data: unmatchedCount } = useQuery({
    queryKey: ['unmatched-count'],
    queryFn: () => base44.entities.UnmatchedEmail.filter({ review_status: 'pending' }),
    select: d => d.length,
  });

  const historyRecord = syncState.find(s => s.key === 'gmail_history_id');

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('gmailSync', {});
      const { synced, unmatched, total } = res.data;
      toast.success(`Sync ολοκληρώθηκε: ${synced} αντιστοιχίστηκαν, ${unmatched} αναντίστοιχα (σύνολο ${total})`);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error('Σφάλμα κατά το sync: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Integration"
        subtitle="Διαχείριση σύνδεσης email και συγχρονισμός με πελάτες"
        icon={Mail}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{messageCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Συγχρονισμένα Emails</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unmatchedCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Αναντίστοιχα (Pending)</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {historyRecord ? 'Ενεργό' : 'Μη ενεργό'}
              </p>
              <p className="text-xs text-muted-foreground">Κατάσταση Sync</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gmail connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Gmail / Google Workspace
          </CardTitle>
          <CardDescription>Σύνδεση εταιρικού Gmail για αυτόματο συγχρονισμό</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center">
                <span className="text-base font-bold text-red-500">G</span>
              </div>
              <div>
                <p className="text-sm font-medium">Gmail</p>
                <p className="text-xs text-muted-foreground">
                  {historyRecord
                    ? `Τελευταίο sync: History ID ${historyRecord.value}`
                    : 'Δεν έχει γίνει sync ακόμα'
                  }
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Συνδεδεμένο
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSync} disabled={syncing} className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Συγχρονισμός…' : 'Sync Τώρα'}
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Το σύστημα συγχρονίζεται αυτόματα σε πραγματικό χρόνο μέσω webhook.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Matching rules info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Κανόνες Αντιστοίχισης</CardTitle>
          <CardDescription>Πώς αντιστοιχίζονται τα emails στους πελάτες</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {[
              'Αντιστοίχιση με βάση το κύριο email του πελάτη (ακριβής αντιστοίχιση)',
              'Αντιστοίχιση με βάση domain της εταιρείας (π.χ. @company.gr)',
              'Emails από δημόσιους παρόχους (gmail.com, yahoo.com κλπ) δεν αντιστοιχίζονται με domain',
              'Αν δεν βρεθεί αντιστοίχιση, το email πηγαίνει στην ουρά "Αναντίστοιχα"',
            ].map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center font-semibold">{i+1}</span>
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
