import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Bot, CheckCircle2, XCircle, Globe, Eye, EyeOff, FileText } from 'lucide-react';
import { toast } from 'sonner';
import QuoteTemplateSettings from '@/components/settings/QuoteTemplateSettings';

async function loadSetting(key) {
  const all = await base44.entities.AppSettings.list();
  return all.find(s => s.key === key) || null;
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
      <Tabs defaultValue="telegram">
        <TabsList className="bg-slate-100 rounded-xl h-10 flex-wrap gap-1">
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
        <TabsContent value="telegram" className="mt-6"><TelegramSettings /></TabsContent>
        <TabsContent value="voip" className="mt-6"><VoIPSettings /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AISettings /></TabsContent>
        <TabsContent value="quotes" className="mt-6"><QuoteTemplateSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function TelegramSettings() {
  const [token, setToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadSetting('telegram').then(rec => {
      if (rec) {
        setToken(rec.telegram_bot_token || '');
        setWebhookUrl(rec.telegram_webhook_url || '');
        setTestChatId(rec.telegram_test_chat_id || '');
      }
    });
  }, []);

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
      else { setWebhookStatus('error'); toast.error(data.description || 'Σφάλμα webhook'); }
    } catch { toast.error('Σφάλμα σύνδεσης'); setWebhookStatus('error'); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('telegram', {
        telegram_bot_token: token,
        telegram_webhook_url: webhookUrl,
        telegram_test_chat_id: testChatId,
      });
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
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
            <Label className="text-xs font-bold uppercase text-slate-500">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://api.base44.com/api/apps/.../functions/telegramAI" className="text-sm rounded-xl" />
              <Button variant="outline" onClick={setWebhookFn} disabled={!token || !webhookUrl || testing} className="rounded-xl shrink-0 gap-2">
                <Globe className="w-4 h-4" /> Set
              </Button>
            </div>
            {webhookStatus === 'ok' && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Webhook ενεργό</p>}
            {webhookStatus === 'error' && <p className="text-xs text-red-600 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Σφάλμα webhook</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Chat ID (για test μήνυμα)</Label>
            <Input value={testChatId} onChange={(e) => setTestChatId(e.target.value)} placeholder="π.χ. 123456789" className="font-mono text-sm rounded-xl" />
            <p className="text-xs text-slate-400">Στείλε /start στο bot σου και δες το chat_id σου στο <strong>@userinfobot</strong></p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <p className="font-black uppercase tracking-wide text-slate-400 mb-2">Οδηγίες Σύνδεσης</p>
            <p>1. Telegram → <strong>@BotFather</strong> → <strong>/newbot</strong></p>
            <p>2. Βάλε το token και πάτα <strong>Test</strong></p>
            <p>3. Dashboard → Code → Functions → telegramAI → <strong>Function URL</strong></p>
            <p>4. Βάλε το URL και πάτα <strong>Set</strong></p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VoIPSettings() {
  const [form, setForm] = useState({ voip_host: '', voip_api_key: '', voip_webhook_secret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSetting('voip').then(rec => {
      if (rec) setForm({ voip_host: rec.voip_host || '', voip_api_key: rec.voip_api_key || '', voip_webhook_secret: rec.voip_webhook_secret || '' });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('voip', form);
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setSaving(false);
    }
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
        <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}

function AISettings() {
  const [form, setForm] = useState({ ollama_host: '', whisper_host: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSetting('ai').then(rec => {
      if (rec) setForm({ ollama_host: rec.ollama_host || '', whisper_host: rec.whisper_host || '' });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('ai', form);
      toast.success('Ρυθμίσεις αποθηκεύτηκαν!');
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setSaving(false);
    }
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
        <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Αποθήκευση
        </Button>
      </CardContent>
    </Card>
  );
}