import React, { useState, useEffect } from 'react';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhoneCall, Send, Save, Loader2 } from 'lucide-react';

export default function Settings() {
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Φορτώνουμε το token από τη μνήμη του browser
  useEffect(() => {
    const savedToken = localStorage.getItem('nexus_telegram_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('nexus_telegram_token', token);
    setTimeout(() => {
      setIsSaving(false);
      alert("✅ ΟΚ! Το Token αποθηκεύτηκε τοπικά.");
    }, 500);
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Ρυθμίσεις Nexus" subtitle="Local Storage Mode (Safe)" />
      
      <Tabs defaultValue="telegram">
        <TabsList className="mb-8">
          <TabsTrigger value="telegram" className="px-10"><Send className="mr-2 w-4 h-4"/> Telegram AI</TabsTrigger>
          <TabsTrigger value="voip" className="px-10"><PhoneCall className="mr-2 w-4 h-4"/> 3CX</TabsTrigger>
        </TabsList>

        <TabsContent value="telegram">
          <Card className="rounded-[2.5rem] shadow-2xl p-10 space-y-6 border-slate-200">
            <Label className="font-bold text-slate-500 uppercase text-xs">Bot Token</Label>
            <Input 
              value={token} 
              onChange={(e) => setToken(e.target.value)}
              placeholder="8261327279:..." 
              className="h-14 rounded-2xl border-slate-200" 
            />
            
            <Button 
              type="button" variant="outline" className="w-full h-12 rounded-xl border-dashed border-[#0088cc] text-[#0088cc] font-bold"
              onClick={async () => {
                if(!token) return alert("Βάλε πρώτα το token!");
                
                // ΔΙΟΡΘΩΣΗ: Στέλνουμε το Webhook στη διαδρομή των functions
                const url = `https://api.telegram.org/bot${token}/setWebhook?url=${window.location.origin}/functions/telegramAI`;
                
                try {
                  const res = await fetch(url);
                  const d = await res.json();
                  alert(d.ok ? "✅ ΣΥΝΔΕΘΗΚΕ! Το Bot " + token.split(':')[0] + " είναι Live." : "❌ Σφάλμα: " + d.description);
                } catch (e) { alert("Αποτυχία κλήσης στο Telegram API."); }
              }}
            >
              Ενεργοποίηση Webhook (Σύνδεση)
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-10 right-10">
        <Button 
          onClick={handleSave}
          disabled={isSaving} 
          className="h-16 px-12 rounded-2xl bg-slate-900 text-white font-black shadow-2xl uppercase tracking-widest gap-3"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5 text-emerald-400" />}
          Αποθήκευση
        </Button>
      </div>
    </div>
  );
}
