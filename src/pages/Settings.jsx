import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Bot, CheckCircle2, XCircle, Globe, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
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
        <TabsContent value="telegram" className="mt-6"><TelegramSettings /></TabsContent>
        <TabsContent value="voip" className="mt-6"><VoIPSettings /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AISettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function useSetting(key) {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({
    queryKey: ['app-settings', key],
    queryFn: async () => {
      const all = await base44.entities.AppSettings.list();
      return all.filter(s => s.key === key);
    },
  });
  const existing = list[0] || null;

  const save = async (data) => {
    // Fresh fetch για να αποφύγουμε stale closure
    const all = await base44.entities.AppSettings.list();
    const fresh = all.find(s => s.key === key);
    if (fresh?.id) {
      await base44.entities.AppSettings.update(fresh.id, { ...data, key });
    } else {
      await base44.entities.AppSettings.create({ ...data, key });
    }
    qc.invalidateQueries({ queryKey: ['app-settings', key] });
    toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
  };

  return { existing, save };
}

function TelegramSettings() {
  const { existing, save } = useSetting('telegram');
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setToken(existing.telegram_bot_token || '');
      setWebhookUrl(existing.telegram_webhook_url || '');
      setTestChatId(existing.telegram_test_chat_id || '');
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
      if (data.ok) { setBotInfo(data.result); toast.success(`Bot βρέθηκε: @${data.result.username}`); }
      else toast.error('Λάθος token ή bot δεν υπάρχει');
    } catch { toast.error('Σφάλμα σύνδεσης'); }
    finally { setTesting(false); }
  };

  const setWebhookFn = async () => {
    if (!token || !webhookUrl) return;
    setTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) { setWebhookStatus('ok'); toast.success('Webhook ορίστηκε επιτυχώς!'); }
      else { setWebhookStatus('error'); toast.error(data.description || 'Σφάλμα ορισμού webhook'); }
    } catch { toast.error('Σφάλμα σύνδεσης'); setWebhookStatus('error'); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ telegram_bot_token: token, telegram_webhook_url: webhookUrl, telegram_test_chat_id: testChatId });
      // Αν υπάρχει chat_id, στείλε μήνυμα "σε λειτουργία"
      if (token && testChatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: testChatId,
            text: '✅ *Nexus ERP Bot ενεργοποιήθηκε!*\n\nΤο bot είναι σε λειτουργία και έτοιμο να δεχτεί εντολές.',
            parse_mode: 'Markdown',
          }),
        });
        toast.success('Μήνυμα εκκίνησης εστάλη στο Telegram!');
      }
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setSaving(false);
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
              <div className="relative flex-1">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="1234567890:ABCdef..."
                  className="font-mono text-sm rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://api.base44.com/api/apps/.../functions/telegramAI" className="text-sm rounded-xl" />
              <Button variant="outline" onClick={setWebhookFn} disabled={!token || !webhookUrl || testing} className="rounded-xl shrink-0 gap-2">
                <Globe className="w-4 h-4" /> Set
              </Button>
            </div>
            {webhookStatus === 'ok' && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Webhook ενεργό</p>}
            {webhookStatus === 'error' && <p className="text-xs text-red-600 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Σφάλμα ορισμού webhook</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Το Chat ID σου (για test μήνυμα)</Label>
            <Input value={testChatId} onChange={(e) => setTestChatId(e.target.value)} placeholder="π.χ. 123456789" className="font-mono text-sm rounded-xl" />
            <p className="text-xs text-slate-400">Στείλε /start στο bot σου και δες το chat_id σου στο <strong>@userinfobot</strong></p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <p className="font-black uppercase tracking-wide text-slate-400 mb-2">Οδηγίες Σύνδεσης</p>
            <p>1. Πήγαινε στο Telegram → <strong>@BotFather</strong> → <strong>/newbot</strong></p>
            <p>2. Βάλε το token εδώ και πάτα <strong>Test</strong></p>
            <p>3. Dashboard → Code → Functions → telegramAI → πάρε το <strong>Function URL</strong></p>
            <p>4. Βάλε το URL στο Webhook URL και πάτα <strong>Set</strong></p>
          </div>

          <Button type="button" onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VoIPSettings() {
  const { existing, save } = useSetting('voip');
  const [form, setForm] = useState({ voip_host: '', voip_api_key: '', voip_webhook_secret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ voip_host: existing.voip_host || '', voip_api_key: existing.voip_api_key || '', voip_webhook_secret: existing.voip_webhook_secret || '' });
  }, [existing]);

  const handleSave = async () => {
    setSaving(true);
    try { await save(form); }
    catch (e) { toast.error('Σφάλμα: ' + e.message); }
    finally { setSaving(false); }
  };

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
        <Button type="button" onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}

function AISettings() {
  const { existing, save } = useSetting('ai');
  const [form, setForm] = useState({ ollama_host: '', whisper_host: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ollama_host: existing.ollama_host || '', whisper_host: existing.whisper_host || '' });
  }, [existing]);

  const handleSave = async () => {
    setSaving(true);
    try { await save(form); }
    catch (e) { toast.error('Σφάλμα: ' + e.message); }
    finally { setSaving(false); }
  };

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
        <Button type="button" onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}