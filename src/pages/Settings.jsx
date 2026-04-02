import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Bot, FileText, Shield, Users, ToggleLeft, AlertTriangle, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import QuoteTemplateSettings from '@/components/settings/QuoteTemplateSettings';
import UserManagement from '@/components/settings/UserManagement';
import FeatureAccessSettings from '@/components/settings/FeatureAccessSettings';
import RolesPermissionsMatrix from '@/components/settings/RolesPermissionsMatrix';
import { runtimeConfig } from '@/lib/runtime-config';
import SecureVoIPSettings from './VoIPSettings';

async function loadSetting(key) {
  const all = await base44.entities.AppSettings.list();
  return all.find((setting) => setting.key === key) || null;
}

async function saveSetting(key, data) {
  const existing = await loadSetting(key);
  if (existing?.id) {
    await base44.entities.AppSettings.update(existing.id, { ...data, key });
  } else {
    await base44.entities.AppSettings.create({ ...data, key });
  }
}

export default function Settings() {
  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Ρυθμίσεις" subtitle="Διαχείριση συνδέσεων και υπηρεσιών" />
      <Tabs defaultValue="users">
        <TabsList className="bg-slate-100 rounded-xl h-auto p-1 flex-wrap gap-1">
          <TabsTrigger value="users" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <Users className="w-3.5 h-3.5 mr-2" /> Χρήστες
          </TabsTrigger>
          <TabsTrigger value="features" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <ToggleLeft className="w-3.5 h-3.5 mr-2" /> Feature Access
          </TabsTrigger>
          <TabsTrigger value="matrix" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5 mr-2" /> Roles Matrix
          </TabsTrigger>
          <TabsTrigger value="telegram" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <Bot className="w-3.5 h-3.5 mr-2" /> Telegram Bot
          </TabsTrigger>
          <TabsTrigger value="voip" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            VoIP / 3CX
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            AI Engine
          </TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5 mr-2" /> Template Προσφοράς
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6"><UserManagement /></TabsContent>
        <TabsContent value="features" className="mt-6"><FeatureAccessSettings /></TabsContent>
        <TabsContent value="matrix" className="mt-6"><RolesPermissionsMatrix /></TabsContent>
        <TabsContent value="telegram" className="mt-6"><TelegramSettings /></TabsContent>
        <TabsContent value="voip" className="mt-6"><SecureVoIPSettings /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AISettings /></TabsContent>
        <TabsContent value="quotes" className="mt-6"><QuoteTemplateSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function TelegramSettings() {
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
    <div className="space-y-6">
      <Card className={`p-6 border-2 ${statusTone === 'emerald' ? 'border-emerald-500 bg-emerald-50' : statusTone === 'red' ? 'border-red-500 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
        <div className={`flex items-center gap-3 font-bold ${statusTone === 'emerald' ? 'text-emerald-700' : statusTone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
          <div className={`w-3 h-3 rounded-full ${statusTone === 'emerald' ? 'bg-emerald-500' : statusTone === 'red' ? 'bg-red-500' : 'bg-amber-500'} ${health.status === 'loading' ? 'animate-pulse' : ''}`} />
          {health.message}
        </div>
      </Card>

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
            <p>4. Προαιρετικά όρισε `TELEGRAM_WEBHOOK_SECRET` για header verification από το Telegram.</p>
            <p>5. Ξανακάνε set το webhook στο παραπάνω URL χωρίς αλλαγή στον business logic κώδικα.</p>
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
    </div>
  );
}

function AISettings() {
  const [form, setForm] = useState({ ollama_host: '', whisper_host: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSetting('ai').then((record) => {
      if (record) {
        setForm({ ollama_host: record.ollama_host || '', whisper_host: record.whisper_host || '' });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('ai', form);
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
    } catch (error) {
      toast.error('Σφάλμα: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Ollama Host (local AI)</Label>
          <Input value={form.ollama_host} onChange={(e) => setForm({ ...form, ollama_host: e.target.value })} placeholder="http://localhost:11434" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Whisper Host (speech-to-text)</Label>
          <Input value={form.whisper_host} onChange={(e) => setForm({ ...form, whisper_host: e.target.value })} placeholder="http://localhost:9000" className="rounded-xl" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}
