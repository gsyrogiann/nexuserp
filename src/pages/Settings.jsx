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
import { PhoneCall, Send, Save, Loader2 } from 'lucide-react';

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

      console.log("Internal API request attempt:", payload);

      // Χρησιμοποιούμε το εσωτερικό api.request του SDK που είναι το πιο low-level
      const path = config?.id 
        ? `/entities/AppSettings/${config.id}` 
        : `/entities/AppSettings`;
      
      return await base44.api.request(path, {
        method: config?.id ? 'PATCH' : 'POST',
        data: payload
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      alert("✅ ΤΑ ΚΑΤΑΦΕΡΑΜΕ! Οι ρυθμίσεις σώθηκαν.");
    },
    onError: (err) => {
      console.error("Internal SDK Error:", err);
      alert("❌ Σφάλμα: " + (err.message || "Αποτυχία σύνδεσης"));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    updateMutation.mutate(data);
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Ρυθμίσεις Nexus" subtitle="Διαχείριση Bot & VoIP" />
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="telegram">
          <TabsList className="mb-8">
            <TabsTrigger value="voip" className="px-10"><PhoneCall className="mr-2 w-4 h-4"/> 3CX</TabsTrigger>
            <TabsTrigger value="telegram" className="px-10"><Send className="mr-2 w-4 h-4"/> Telegram AI</TabsTrigger>
          </TabsList>

          <TabsContent value="telegram">
            <Card className="rounded-[2.5rem] shadow-2xl p-10 space-y-6">
              <Label className="font-bold">Bot Token</Label>
              <Input name="telegram_token" defaultValue={config?.telegram_token} placeholder="Βάλε το token εδώ" className="h-14 rounded-2xl" />
              
              <Button 
                type="button" variant="outline" className="w-full h-12 rounded-xl border-dashed border-[#0088cc] text-[#0088cc]"
                onClick={async () => {
                  if(!config?.telegram_token) return alert("Σώσε πρώτα το token!");
                  const url = `https://api.telegram.org/bot${config.telegram_token}/setWebhook?url=${window.location.origin}/api/telegram-webhook`;
                  const res = await fetch(url);
                  const d = await res.json();
                  alert(d.ok ? "✅ Το Webhook ενεργοποιήθηκε!" : "❌ Telegram: " + d.description);
                }}
              >
                Σύνδεση με Telegram
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-10 right-10">
          <Button type="submit" disabled={updateMutation.isPending} className="h-16 px-12 rounded-2xl bg-slate-900 text-white font-black italic shadow-2xl uppercase">
            {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            Αποθήκευση
          </Button>
        </div>
      </form>
    </div>
  );
}
