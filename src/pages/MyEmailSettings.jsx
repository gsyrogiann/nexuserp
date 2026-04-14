import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MyEmailSettings() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    if (user?.outlook_email) {
      setEmail(user.outlook_email);
      setHasCredentials(true);
    }
  }, [user]);

  const handleConnect = async () => {
    if (!email) {
      toast.error('Παρακαλώ εισάγετε το email');
      return;
    }

    setSaving(true);
    try {
      const res = await base44.functions.invoke('msOAuthStart', { email });
      const url = res?.data?.url;
      if (!url) {
        throw new Error('Δεν επιστράφηκε OAuth URL');
      }
      window.location.href = url;
    } catch (err) {
      toast.error('Σφάλμα: ' + (err?.message || 'OAuth failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('msOAuthDisconnect', {});
      setEmail('');
      setHasCredentials(false);
      toast.success('Η σύνδεση αποσυνδέθηκε');
    } catch (err) {
      toast.error('Σφάλμα: ' + (err?.message || 'Disconnect failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Ρυθμίσεις Email" subtitle="Σύνδεση του Outlook account σας" />

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <CardTitle>Outlook Credentials</CardTitle>
                <CardDescription>Εισάγετε τα στοιχεία του Outlook σας</CardDescription>
              </div>
            </div>
            {hasCredentials && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Συνδεδεμένο
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              className="rounded-xl"
              disabled={saving}
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            Η σύνδεση γίνεται μέσω Microsoft OAuth. Δεν αποθηκεύουμε password.
          </div>

          <div className="flex gap-3">
            <Button onClick={handleConnect} disabled={saving || !email} className="flex-1 h-11 rounded-xl font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Σύνδεση με Microsoft
            </Button>
            {hasCredentials && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={saving}
                className="h-11 rounded-xl font-bold"
              >
                Αφαίρεση
              </Button>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 space-y-2">
            <p className="font-bold uppercase tracking-wide">ℹ️ Πληροφορίες</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Τα στοιχεία σας αποθηκεύονται κρυπτογραφημένα στον server</li>
              <li>Χρησιμοποιούνται αποκλειστικά για τη σύγχρονση emails</li>
              <li>Μόνο εσείς και οι admins μπορούν να τα δείτε</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
