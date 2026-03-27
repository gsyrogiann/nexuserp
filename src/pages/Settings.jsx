import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { appParams } from '@/lib/app-params'; // Χρειαζόμαστε τις παραμέτρους για το fetch
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneCall, Globe, Truck, Save, Loader2, Send } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();
  const { appId, token } = appParams;

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

      // Χρησιμοποιούμε fetch για να παρακάμψουμε εντελώς το προβληματικό SDK
      const url = config?.id 
        ? `https://api.base44.app/v1/apps/${appId}/entities/AppSettings/${config.id}`
        : `https://api.base44.app/v1/apps/${appId}/entities/AppSettings`;

      const response = await fetch(url, {
        method: config?.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Αποτυχία API');
      }
      return await response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      alert("✅ ΕΠΙΤΥΧΙΑ! Το Nexus ERP συγχρονίστηκε.");
    },
    onError: (err) => {
      alert("❌ Σφάλμα: " + err.message);
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
    <div className="space-y-6 pb-20">
      <PageHeader title="Ρυθμίσεις" subtitle="Διαχείριση Nexus ERP" />
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="telegram">
          <TabsList className="mb-8">
            <TabsTrigger value="voip"><PhoneCall className="w-4 h-4 mr-2"/> 3CX</TabsTrigger>
            <TabsTrigger value="telegram"><Send className="w-4 h-4 mr-2"/> Telegram</TabsTrigger>
          </TabsList>

          <TabsContent value="voip">
            <Card className="rounded-[2.5rem] shadow-2xl">
              <CardContent className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>3CX Host</Label>
                    <Input name="voip_host" defaultValue={config?.voip_host} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input name="voip_api_key" type="password" defaultValue={config?.voip_api_key} className="rounded-xl h-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="rounded-[2.5rem] shadow-2xl">
              <CardContent className="p-10 space-y-6">
                <Label>Bot Token</Label>
                <Input name="telegram_token" defaultValue={config?.telegram_token} className="rounded-xl h-12" />
                <Button 
                  type="button" variant="outline" className="w-full"
                  onClick={async () => {
                    if(!config?.telegram_token) return alert("Σώσε πρώτα!");
                    const url = `https://api.telegram.org/bot${config.telegram_token}/setWebhook?url=${window.location.origin}/api/telegram-webhook`;
                    const res = await fetch(url);
                    const d = await res.json();
                    alert(d.ok ? "Live!" : d.description);
                  }}
                > Συνδέση Webhook </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="fixed bottom-10 right-10">
          <Button type="submit" disabled={updateMutation.isPending} className="h-16 px-10 rounded-2xl bg-slate-900 text-white">
            {updateMutation.isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />}
            Αποθήκευση
          </Button>
        </div>
      </form>
    </div>
  );
}
