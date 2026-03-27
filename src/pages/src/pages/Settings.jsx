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
import { PhoneCall, Globe, Truck, Save, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';

export default function Settings() {
  const qc = useQueryClient();

  // Φόρτωση των υπαρχουσών ρυθμίσεων από το Entity AppSettings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => fetchList(base44.entities.AppSettings),
  });

  const config = settings[0] || {}; // Παίρνουμε το πρώτο record (Global Config)

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (config.id) {
        return base44.entities.AppSettings.update(config.id, data);
      }
      return base44.entities.AppSettings.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appSettings'] });
      alert("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς!");
    },
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
            <TabsTrigger value="ecommerce" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Globe className="w-4 h-4" /> E-Shop
            </TabsTrigger>
            <TabsTrigger value="courier" className="rounded-xl gap-2 font-bold px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Truck className="w-4 h-4" /> Courier
            </TabsTrigger>
          </TabsList>

          {/* --- 3CX VOIP SETTINGS --- */}
          <TabsContent value="voip" className="animate-in slide-in-from-left-4 duration-300">
            <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b p-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Διασύνδεση 3CX</CardTitle>
                    <p className="text-xs text-slate-500 font-medium">Σύνδεση τηλεφωνικού κέντρου για αυτόματο Call Logging & AI</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">3CX FQDN / Host</Label>
                    <Input 
                      name="voip_host" 
                      defaultValue={config.voip_host} 
                      placeholder="π.χ. nexus-erp.3cx.gr" 
                      className="rounded-2xl h-14 border-slate-200 focus:ring-primary font-bold italic"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">API Key / Secret</Label>
                    <Input 
                      name="voip_api_key" 
                      type="password" 
                      defaultValue={config.voip_api_key} 
                      placeholder="••••••••••••••••" 
                      className="rounded-2xl h-14 border-slate-200 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-blue-900 uppercase tracking-tight italic">Ασφαλής Σύνδεση</p>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                      Τα κλειδιά σας αποθηκεύονται κρυπτογραφημένα. Μόλις πατήσετε αποθήκευση, το Nexus θα ξεκινήσει να "ακούει" τις κλήσεις από το 3CX Webhook.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- E-SHOP & COURIER PLACEHOLDERS --- */}
          <TabsContent value="ecommerce" className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed">
            <Globe className="w-12 h-12 mx-auto text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase italic">Coming Soon: WooCommerce & Shopify Sync</p>
          </TabsContent>

          <TabsContent value="courier" className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed">
            <Truck className="w-12 h-12 mx-auto text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase italic">Coming Soon: ACS, General & Speedex API</p>
          </TabsContent>
        </Tabs>

        {/* Floating Save Button */}
        <div className="fixed bottom-10 right-10 z-50">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="h-16 px-10 rounded-2xl shadow-2xl bg-slate-900 hover:bg-slate-800 text-white font-black italic uppercase tracking-widest gap-3 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
          >
            {updateMutation.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 text-emerald-400" />}
            Αποθήκευση Ρυθμίσεων
          </Button>
        </div>
      </form>
    </div>
  );
}
