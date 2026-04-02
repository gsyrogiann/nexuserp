import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Save, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function MyEmailSettings() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    if (user?.outlook_email) {
      setEmail(user.outlook_email);
      setHasCredentials(true);
    }
  }, [user]);

  const handleSave = async () => {
    if (!email) {
      toast.error('Παρακαλώ εισάγετε το email');
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        outlook_email: email,
        outlook_password: password || undefined,
      });
      setHasCredentials(true);
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
    } catch (err) {
      toast.error('Σφάλμα: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        outlook_email: null,
        outlook_password: null,
      });
      setEmail('');
      setPassword('');
      setHasCredentials(false);
      toast.success('Στοιχεία διαγράφηκαν');
    } catch (err) {
      toast.error('Σφάλμα: ' + err.message);
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

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Password ή App Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="rounded-xl pr-10"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Για Microsoft 365, χρησιμοποιήστε <strong>App Password</strong> αντί του κανονικού password
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || !email} className="flex-1 h-11 rounded-xl font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Αποθήκευση
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
