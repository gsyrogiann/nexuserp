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
import { PhoneCall, Globe, Truck, Save, Loader2, ShieldCheck, Send, MessageSquare } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();

  // Fetch settings from base44
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => fetchList(base44.entities.AppSettings),
  });

  const config = settings[0] || null;

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Καθαρισμός των δεδομένων πριν την αποστολή
      const payload = {
        voip_host: data.voip_host || "",
        voip_api_key: data.voip_api_key || "",
        telegram_token: data.telegram_token || ""
      };

      console.log("Sending to Base44:", payload);

      if (config && config.id) {
        // Αν υπάρχει εγγραφή, κάνουμε UPDATE
        return await base44.entities.AppSettings.update(config.id, payload);
      } else {
        // Αν είναι η πρώτη φορά, κάνουμε CREATE
        return await base44.entities.AppSettings.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      alert("✅ Το Nexus ERP ενημερώθηκε επιτυχώς!");
    },
    onError: (err) => {
      console.error("Critical Sync Error:", err);
      alert("❌ Σφάλμα: " + (err.message || "Αποτυχία σύνδεσης με τη βάση"));
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
      <PageHeader 
        title="Ρυθμίσεις Συστήματος" 
        subtitle="Διαχείριση API Keys και Διασυνδέσεων Nexus ERP" 
      />

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="voip" className="w-full">
          <TabsList className="bg-white p-1 rounded-2xl border mb-8 shadow-sm inline-flex">
            <TabsTrigger value="voip" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <PhoneCall className="w-4 h-4" /> 3CX VoIP
            </TabsTrigger>
            <TabsTrigger value="telegram" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Send className="w-4 h-4" /> Telegram AI
            </TabsTrigger>
            <TabsTrigger value="ecommerce" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Globe className="w-4 h-4" /> E-Shop
            </TabsTrigger>
            <TabsTrigger value="courier" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Truck className="w-4 h-4" /> Courier
            </TabsTrigger>
          </TabsList>

          {/* 3CX TAB */}
          <TabsContent value="voip" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b p-8">
                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Διασύνδεση 3CX</CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">3CX FQDN</Label>
                    <Input name="voip_host" defaultValue={config?.voip_host} placeholder="nexus.3cx.gr" className="rounded-2xl h-14" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">API Key</Label>
                    <Input name="voip_api_key" type="password" defaultValue={config?.voip_api_key} className="rounded-2xl h-14" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TELEGRAM TAB */}
          <TabsContent value="telegram" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b p-8">
                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-[#0088cc]">Telegram AI Bridge</CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bot Token</Label>
                  <Input name="telegram_token" defaultValue={config?.telegram_token} placeholder="8261327279:..." className="rounded-2xl h-14" />
                </div>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-dashed border-2 border-[#0088cc] text-[#0088cc] font-bold h-12"
                  onClick={async () => {
                    if(!config?.telegram_token) return alert("Σώσε πρώτα το token και μετά πάτα σύνδεση!");
                    const url = `https://api.telegram.org/bot${config.telegram_token}/setWebhook?url=${window.location.origin}/api/telegram-webhook`;
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        if(data.ok) alert("Το Bot συνδέθηκε επιτυχώς με το ERP!");
                        else alert("Telegram Error: " + data.description);
                    } catch (e) {
                        alert("Αποτυχία κλήσης στο Telegram API.");
                    }
                  }}
                >
                  <Send className="w-4 h-4 mr-2" /> Ενεργοποίηση Webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-10 right-10 z-50">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending} 
            className="h-16 px-10 rounded-2xl shadow-2xl bg-slate-900 text-white font-black italic uppercase tracking-widest gap-3 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
          >
            {updateMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 text-emerald-400" />}
            Αποθήκευση Ρυθμίσεων
          </Button>
        </div>
      </form>
    </div>
  );
}
