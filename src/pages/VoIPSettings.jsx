import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, Save, Copy, CheckCircle2, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runtimeConfig } from '@/lib/runtime-config';
import { executeMutation, validateRequiredFields } from '@/lib/mutationHelpers';

export default function VoIPSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    key: 'voip',
    voip_host: '',
    ollama_host: 'http://localhost:11434',
    whisper_host: 'http://localhost:9000',
  });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState({ status: 'idle', message: 'Δεν έχει γίνει ακόμη έλεγχος.' });

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['appSettings', 'voip'],
    queryFn: () => fetchList(base44.entities.AppSettings, { filter: { key: 'voip' } }),
  });

  const existingSettings = settingsList[0] || null;

  useEffect(() => {
    if (existingSettings) {
      setForm((prev) => ({
        ...prev,
        key: existingSettings.key || 'voip',
        voip_host: existingSettings.voip_host || '',
        ollama_host: existingSettings.ollama_host || 'http://localhost:11434',
        whisper_host: existingSettings.whisper_host || 'http://localhost:9000',
      }));
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = form;
      return executeMutation(
        async () => {
          validateRequiredFields(data, { key: 'Key', voip_host: '3CX Host URL' });
          const payload = {
            ...data,
            // Scrub legacy secrets from application data. Secrets now belong only in server-side env vars.
            voip_api_key: '',
            voip_webhook_secret: '',
          };
          if (existingSettings?.id) {
            return base44.entities.AppSettings.update(existingSettings.id, payload);
          }
          return base44.entities.AppSettings.create(payload);
        },
        {
          actionLabel: 'save VoIP settings',
          fallbackMessage: 'Δεν ήταν δυνατή η αποθήκευση των VoIP ρυθμίσεων.',
          audit: {
            action: existingSettings?.id ? 'update' : 'create',
            target: 'app_settings.voip',
            targetId: existingSettings?.id,
            summary: 'Saved non-sensitive VoIP settings',
            metadata: {
              voipHost: data?.voip_host,
              ollamaHost: data?.ollama_host,
              whisperHost: data?.whisper_host,
            },
          },
        }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    meta: {
      title: 'Αποτυχία αποθήκευσης VoIP',
      fallbackMessage: 'Δεν ήταν δυνατή η αποθήκευση των VoIP ρυθμίσεων.',
    },
  });

  const webhookUrl = runtimeConfig.voipWebhookUrl || 'Ρύθμισε το VITE_BASE44_FUNCTIONS_BASE_URL ή το app base URL';
  const canCheckHealth = Boolean(runtimeConfig.voipWebhookUrl);

  const copyWebhook = () => {
    // The actual function URL format
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkHealth = async () => {
    if (!runtimeConfig.voipWebhookUrl) {
      setHealth({
        status: 'error',
        message: 'Δεν βρέθηκε webhook URL. Ρύθμισε το VITE_BASE44_FUNCTIONS_BASE_URL ή το Base44 app URL.',
      });
      return;
    }

    setHealth({ status: 'loading', message: 'Έλεγχος VoIP webhook...' });
    try {
      const response = await fetch(runtimeConfig.voipWebhookUrl, { method: 'GET' });
      const data = await response.json();
      setHealth({
        status: response.ok && data.configured ? 'ok' : 'error',
        message: data.message || 'Το webhook απάντησε χωρίς διαγνωστικό μήνυμα.',
      });
    } catch (error) {
      setHealth({
        status: 'error',
        message: error.message || 'Αποτυχία σύνδεσης με το VoIP webhook.',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-blue-50 rounded-2xl">
          <PhoneCall className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 italic uppercase">VoIP Settings</h1>
          <p className="text-xs text-slate-500 font-medium">3CX Integration & Local AI Bridge</p>
        </div>
      </div>

      {/* Webhook URL card */}
      <Card className="border-blue-100 bg-blue-50/50 rounded-2xl">
        <CardContent className="p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Webhook URL για 3CX</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white rounded-xl px-3 py-2 border border-blue-100 truncate text-slate-700">
              {webhookUrl}
            </code>
            <Button size="sm" variant="outline" className="rounded-xl border-blue-200 shrink-0" onClick={copyWebhook}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-blue-600/70 mt-2">Χρησιμοποιήστε το παραπάνω URL στις ρυθμίσεις Webhook του 3CX. Στείλτε το <code>VOIP_API_KEY</code> ως header <code>x-api-key</code> και προαιρετικά το <code>VOIP_WEBHOOK_SECRET</code> ως header <code>x-webhook-secret</code>.</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold text-slate-600">{health.message}</span>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={checkHealth} disabled={!canCheckHealth || health.status === 'loading'}>
              Έλεγχος Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Secure Secret Handling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-emerald-900">
          <p>Τα secrets του VoIP δεν αποθηκεύονται πλέον στα AppSettings ή στο frontend.</p>
          <p>Ρύθμισε τα μόνο στο backend/deployment environment:</p>
          <code className="block rounded-xl bg-white px-3 py-2 text-xs text-slate-700 border border-emerald-100">VOIP_API_KEY=...{'\n'}VOIP_WEBHOOK_SECRET=...{'\n'}VOIP_OLLAMA_HOST=http://localhost:11434{'\n'}VOIP_WHISPER_HOST=http://localhost:9000</code>
        </CardContent>
      </Card>

      {/* Settings form */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Μη ευαίσθητες Ρυθμίσεις & Διευθύνσεις</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="3CX Host URL" placeholder="https://pbx.company.com" value={form.voip_host} onChange={(v) => setForm({ ...form, voip_host: v })} />

          <div className="border-t border-dashed border-slate-100 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Local AI Bridge
            </p>
            <div className="space-y-4">
              <Field label="Ollama Host (Llama 3)" placeholder="http://localhost:11434" value={form.ollama_host} onChange={(v) => setForm({ ...form, ollama_host: v })} />
              <Field label="Whisper Host (Speech-to-Text)" placeholder="http://localhost:9000" value={form.whisper_host} onChange={(v) => setForm({ ...form, whisper_host: v })} />
            </div>
          </div>

          <Button
            className="w-full h-11 rounded-xl font-black uppercase tracking-widest gap-2 mt-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-300" /> ΑΠΟΘΗΚΕΥΤΗΚΕ</>
            ) : (
              <><Save className="w-4 h-4" /> ΑΠΟΘΗΚΕΥΣΗ</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
        <div className={cn("w-2.5 h-2.5 rounded-full", existingSettings ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
        <span className="text-xs font-bold text-slate-600">
          {existingSettings ? 'Οι μη ευαίσθητες VoIP ρυθμίσεις είναι αποθηκευμένες.' : 'Μη ρυθμισμένο — Αποθήκευσε τις μη ευαίσθητες ρυθμίσεις και όρισε τα secrets στο environment.'}
        </span>
        {existingSettings && <Badge className="ml-auto text-[9px] font-black bg-emerald-500 text-white">SAVED</Badge>}
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">{label}</label>
      <Input
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border-slate-200 bg-slate-50 h-10 font-mono text-sm"
      />
    </div>
  );
}
