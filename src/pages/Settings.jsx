import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneCall, Globe, Truck, Save, Loader2, Send } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => fetchList(base44.entities.AppSettings),
  });

  const config = settings[0] || null;

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        voip_host: data.voip_host || "",
        voip_api_key: data.voip_api_key || "",
        telegram_token: data.telegram_token || ""
      };

      // Απευθείας κλήση στο API για να παρακάμψουμε το SDK "is not a function"
      const method = config?.id ? 'PATCH' : 'POST';
      const url = config?.id 
        ? `${window.location.origin}/api/entities/AppSettings/${config.id}`
        : `${window.location.origin}/api/entities/AppSettings`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Αποτυχία επικοινωνίας με το API');
      return await response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      alert("✅ Το Nexus ERP ενημερώθηκε επιτυχώς!");
    },
    onError: (err) => {
      alert("❌ Σφάλμα API: " + err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    updateMutation.mutate(data);
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <PageHeader title="Ρυθμίσεις Συστήματος" subtitle="Διαχείριση API Keys" />

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="voip" className="w-full">
          <TabsList className="bg-white p-1 rounded-2xl border mb-8 shadow-sm">
            <TabsTrigger value="voip" className="rounded-xl px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <PhoneCall className="w-4 h-4 mr-2" /> 3CX VoIP
            </TabsTrigger>
            <TabsTrigger value="telegram" className="rounded-xl px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Send className="w-4 h-4 mr-2" /> Telegram AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voip">
            <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl">
              <CardHeader className="bg-slate-50/50 border-b p-8">
                <CardTitle className="text-2xl font-black italic uppercase italic">Διασύνδεση 3CX</CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400">3CX FQDN</Label>
                    <Input name="voip_host" defaultValue={config?.voip_host} placeholder="nexus.3cx.gr" className="rounded-2xl h-14" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400">API Key</Label>
                    <Input name="voip_api_key" type="password" defaultValue={config?.voip_api_key} className="rounded-2xl h-14" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl">
              <CardHeader className="bg-slate-50/50 border-b p-8">
                <CardTitle className="text-2xl font-black italic uppercase text-[#0088cc]">Telegram AI Bridge</CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Bot Token</Label>
                  <Input name="telegram_token" defaultValue={config?.telegram_token} placeholder="8261327279:..." className="rounded-2xl h-14" />
                </div>
                <Button 
                  type="button" variant="outline" className="w-full rounded-xl border-[#0088cc] text-[#0088cc] font-bold h-12"
                  onClick={async () => {
                    if(!config?.telegram_token) return alert("Σώσε πρώτα το token!");
                    const url = `https://api.telegram.org/bot${config.telegram_token}/setWebhook?url=${window.location.origin}/api/telegram-webhook`;
                    const res = await fetch(url);
                    const resData = await res.json();
                    alert(resData.ok ? "Το Bot συνδέθηκε!" : "Σφάλμα: " + resData.description);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" /> Ενεργοποίηση Webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-10 right-10 z-50">
          <Button type="submit" disabled={updateMutation.isPending} className="h-16 px-10 rounded-2xl bg-slate-900 text-white font-black italic uppercase gap-3">
            {updateMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 text-emerald-400" />}
            Αποθήκευση Ρυθμίσεων
          </Button>
        </div>
      </form>
    </div>
  );
}
