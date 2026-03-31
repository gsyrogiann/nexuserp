import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Bot, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const qc = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const getSettings = (key) => settingsList.find(s => s.key === key) || null;

  const saveMutation = useMutation({
    mutationFn: async ({ key, data, existingId }) => {
      if (existingId) {
        return base44.entities.AppSettings.update(existingId, { ...data, key });
      } else {
        return base44.entities.AppSettings.create({ ...data, key });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
    },
    onError: (e) => {
      toast.error('Σφάλμα αποθήκευσης: ' + e.message);
    },
  });

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Ρυθμίσεις" subtitle="Διαχείριση συνδέσεων και υπηρεσιών" />

      <Tabs defaultValue="telegram">
        <TabsList className="bg-slate-100 rounded-xl h-10">
          <TabsTrigger value="telegram" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            <Bot className="w-3.5 h-3.5 mr-2" /> Telegram Bot
          </TabsTrigger>
          <TabsTrigger value="voip" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            VoIP / 3CX
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg text-xs font-bold uppercase tracking-wide">
            AI Engine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram" className="mt-6">
          <TelegramSettings
            existing={getSettings('telegram')}
            onSave={(data) => saveMutation.mutate({ key: 'telegram', data, existingId: getSettings('telegram')?.id })}
            saving={saveMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="voip" className="mt-6">
          <VoIPSettings
            existing={getSettings('voip')}
            onSave={(data) => saveMutation.mutate({ key: 'voip', data, existingId: getSettings('voip')?.id })}
            saving={saveMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AISettings
            existing={getSettings('ai')}
            onSave={(data) => saveMutation.mutate({ key: 'ai', data, existingId: getSettings('ai')?.id })}
            saving={saveMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TelegramSettings({ existing, onSave, saving }) {
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setToken(existing.telegram_bot_token || '');
      setWebhookUrl(existing.telegram_webhook_url || '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  const testBot = async () => {
    if (!token) return;
    setTesting(true);
    setBotInfo(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        setBotInfo(data.result);
        toast.success(`Bot βρέθηκε: @${data.result.username}`);
      } else {
        toast.error('Λάθος token ή bot δεν υπάρχει');
      }
    } catch {
      toast.error('Σφάλμα σύνδεσης');
    } finally {
      setTesting(false);
    }
  };

  const setWebhook = async () => {
    if (!token || !webhookUrl) return;
    setTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookStatus('ok');
        toast.success('Webhook ορίστηκε επιτυχώς!');
      } else {
        setWebhookStatus('error');
        toast.error(data.description || 'Σφάλμα ορισμού webhook');
      }
    } catch {
      toast.error('Σφάλμα σύνδεσης');
      setWebhookStatus('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" /> Telegram Bot Token
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Bot Token (από BotFather)</Label>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="1234567890:ABCdef..."
                className="font-mono text-sm rounded-xl"
                style={{ WebkitTextSecurity: 'disc' }}
              />
              <Button variant="outline" onClick={testBot} disabled={!token || testing} className="rounded-xl shrink-0">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
          </div>

          {botInfo && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-black text-emerald-800">@{botInfo.username}</p>
                <p className="text-xs text-emerald-600">{botInfo.first_name} · ID: {botInfo.id}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Webhook URL (το function URL σου)</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.base44.com/api/apps/.../functions/telegramAI"
                className="text-sm rounded-xl"
              />
              <Button variant="outline" onClick={setWebhook} disabled={!token || !webhookUrl || testing} className="rounded-xl shrink-0 gap-2">
                <Globe className="w-4 h-4" /> Set
              </Button>
            </div>
            {webhookStatus === 'ok' && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Webhook ενεργό</p>
            )}
            {webhookStatus === 'error' && (
              <p className="text-xs text-red-600 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Σφάλμα ορισμού webhook</p>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <p className="font-black uppercase tracking-wide text-slate-400 mb-2">Οδηγίες Σύνδεσης</p>
            <p>1. Πήγαινε στο Telegram → <strong>@BotFather</strong> → <strong>/newbot</strong></p>
            <p>2. Βάλε το token εδώ και πάτα <strong>Test</strong></p>
            <p>3. Dashboard → Code → Functions → telegramAI → πάρε το <strong>Function URL</strong></p>
            <p>4. Βάλε το URL στο Webhook URL και πάτα <strong>Set</strong></p>
          </div>

          <Button
            type="button"
            onClick={() => {
              console.log('Saving telegram:', { token, webhookUrl });
              onSave({ telegram_bot_token: token, telegram_webhook_url: webhookUrl });
            }}
            disabled={saving}
            className="w-full h-11 rounded-xl font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VoIPSettings({ existing, onSave, saving }) {
  const [form, setForm] = useState({ voip_host: '', voip_api_key: '', voip_webhook_secret: '' });

  useEffect(() => {
    if (existing) setForm({
      voip_host: existing.voip_host || '',
      voip_api_key: existing.voip_api_key || '',
      voip_webhook_secret: existing.voip_webhook_secret || '',
    });
  }, [existing]);

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">3CX Host URL</Label>
          <Input value={form.voip_host} onChange={e => setForm({...form, voip_host: e.target.value})} placeholder="https://pbx.company.com" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">API Key</Label>
          <Input value={form.voip_api_key} onChange={e => setForm({...form, voip_api_key: e.target.value})} type="password" className="rounded-xl font-mono" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Webhook Secret</Label>
          <Input value={form.voip_webhook_secret} onChange={e => setForm({...form, voip_webhook_secret: e.target.value})} type="password" className="rounded-xl font-mono" />
        </div>
        <Button onClick={() => onSave(form)} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}

function AISettings({ existing, onSave, saving }) {
  const [form, setForm] = useState({ ollama_host: '', whisper_host: '' });

  useEffect(() => {
    if (existing) setForm({
      ollama_host: existing.ollama_host || '',
      whisper_host: existing.whisper_host || '',
    });
  }, [existing]);

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Ollama Host (local AI)</Label>
          <Input value={form.ollama_host} onChange={e => setForm({...form, ollama_host: e.target.value})} placeholder="http://localhost:11434" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Whisper Host (speech-to-text)</Label>
          <Input value={form.whisper_host} onChange={e => setForm({...form, whisper_host: e.target.value})} placeholder="http://localhost:9000" className="rounded-xl" />
        </div>
        <Button onClick={() => onSave(form)} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}