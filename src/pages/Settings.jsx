import React, { useMemo, useState } from 'react';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { runtimeConfig } from '@/lib/runtime-config';

export default function Settings() {
  const [health, setHealth] = useState({ status: 'idle', message: 'Δεν έχει γίνει ακόμη έλεγχος.' });

  const webhookUrl = runtimeConfig.telegramWebhookUrl;

  const canCheckHealth = Boolean(webhookUrl);
  const statusTone = useMemo(() => {
    if (health.status === 'ok') return 'emerald';
    if (health.status === 'error') return 'red';
    return 'amber';
  }, [health.status]);

  const checkHealth = async () => {
    if (!webhookUrl) {
      setHealth({
        status: 'error',
        message: 'Δεν βρέθηκε webhook URL. Ρύθμισε το VITE_BASE44_FUNCTIONS_BASE_URL ή το Base44 app URL.',
      });
      return;
    }

    setHealth({ status: 'loading', message: 'Έλεγχος webhook...' });
    try {
      const response = await fetch(webhookUrl, { method: 'GET' });
      const data = await response.json();
      setHealth({
        status: response.ok && data.configured ? 'ok' : 'error',
        message: data.message || 'Το webhook απάντησε χωρίς διαγνωστικό μήνυμα.',
      });
    } catch (error) {
      setHealth({
        status: 'error',
        message: error.message || 'Αποτυχία σύνδεσης με το Telegram webhook.',
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Telegram Integration" subtitle="Ασφαλής διαχείριση webhook και token rotation" />

      <Card className={`p-6 border-2 ${statusTone === 'emerald' ? 'border-emerald-500 bg-emerald-50' : statusTone === 'red' ? 'border-red-500 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
        <div className={`flex items-center gap-3 font-bold ${statusTone === 'emerald' ? 'text-emerald-700' : statusTone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
          <div className={`w-3 h-3 rounded-full ${statusTone === 'emerald' ? 'bg-emerald-500' : statusTone === 'red' ? 'bg-red-500' : 'bg-amber-500'} ${health.status === 'loading' ? 'animate-pulse' : ''}`} />
          {health.message}
        </div>
      </Card>

      <Tabs defaultValue="telegram">
        <TabsContent value="telegram">
          <Card className="rounded-[2.5rem] shadow-2xl">
            <CardHeader className="space-y-3 p-8 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <CardTitle className="text-xl font-black tracking-tight">Secure Telegram Configuration</CardTitle>
              </div>
              <p className="text-sm text-slate-600">
                Το bot token δεν αποθηκεύεται πλέον στον browser ή στο `localStorage`. Η εφαρμογή περιμένει το token μόνο από server-side environment variable.
              </p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Webhook URL</p>
                    <code className="block mt-2 text-xs break-all text-slate-700">{webhookUrl || 'Δεν βρέθηκε functions base URL'}</code>
                  </div>
                  <Badge variant="outline">{canCheckHealth ? 'Configured path' : 'Needs config'}</Badge>
                </div>
                <Button onClick={checkHealth} disabled={!canCheckHealth || health.status === 'loading'} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${health.status === 'loading' ? 'animate-spin' : ''}`} />
                  Έλεγχος Webhook
                </Button>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 space-y-2">
                <p className="font-black uppercase tracking-widest text-[11px]">Rotation Checklist</p>
                <p>1. Κάνε revoke το παλιό Telegram token από το BotFather.</p>
                <p>2. Όρισε νέο `TELEGRAM_BOT_TOKEN` στο environment του backend function.</p>
                <p>3. Προαιρετικά όρισε `TELEGRAM_ALLOWED_CHAT_IDS` για allowlist.</p>
                <p>4. Ξανακάνε set το webhook στο παραπάνω URL χωρίς αλλαγή στον business logic κώδικα.</p>
              </div>

              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 flex gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p>
                  Αν έχει εκτεθεί το παλιό token, θεωρείται compromised. Η ασφαλής αποκατάσταση είναι revoke + νέο token και όχι επαναχρησιμοποίηση του ίδιου.
                </p>
              </div>

              <a href="https://core.telegram.org/bots/api#setwebhook" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Telegram webhook docs <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
