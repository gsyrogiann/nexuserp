import React, { useState, useEffect } from 'react';
import PageHeader from '../components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Save, Loader2, MessageSquare } from 'lucide-react';

export default function Settings() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Offline');

  useEffect(() => {
    const savedToken = localStorage.getItem('nexus_telegram_token');
    if (savedToken) setToken(savedToken);
  }, []);

  // Ο "ΚΑΤΑΣΚΟΠΟΣ": Ελέγχει για νέα μηνύματα κάθε 3 δευτερόλεπτα
  useEffect(() => {
    if (!token) return;
    
    const checkMessages = async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1`);
        const data = await res.json();
        
        if (data.ok && data.result.length > 0) {
          const lastMsg = data.result[0].message;
          // Αν το μήνυμα είναι νέο (μέσα στα τελευταία 5 δευτερόλεπτα)
          const now = Math.floor(Date.now() / 1000);
          if (now - lastMsg.date < 5 && lastMsg.text !== "/start") {
            setStatus(`Λήψη: ${lastMsg.text}`);
            
            // Απάντηση αμέσως!
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: lastMsg.chat.id,
                text: `🤖 Nexus Live Mode: George, σε άκουσα! Έγραψες "${lastMsg.text}". Το ERP είναι συνδεδεμένο!`
              })
            });
          }
        }
      } catch (e) { console.error("Polling error", e); }
    };

    const interval = setInterval(checkMessages, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSave = () => {
    localStorage.setItem('nexus_telegram_token', token);
    alert("✅ Το Token σώθηκε! Κράτα αυτή τη σελίδα ανοιχτή.");
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Nexus AI Terminal" subtitle="Live Connection Mode" />
      
      <Card className="p-6 border-2 border-emerald-500 bg-emerald-50">
        <div className="flex items-center gap-3 text-emerald-700 font-bold">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          Status: {status === 'Offline' ? 'Αναμονή για μήνυμα...' : status}
        </div>
      </Card>

      <Tabs defaultValue="telegram">
        <TabsContent value="telegram">
          <Card className="rounded-[2.5rem] shadow-2xl p-10 space-y-6">
            <Label className="font-bold">Telegram Bot Token</Label>
            <Input 
              value={token} 
              onChange={(e) => setToken(e.target.value)}
              placeholder="Βάλε το token εδώ..." 
              className="h-14 rounded-2xl" 
            />
            <Button onClick={handleSave} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold">
              <Save className="mr-2" /> ΕΝΕΡΓΟΠΟΙΗΣΗ LIVE CONNECTION
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 text-blue-800 text-sm">
        <strong>Οδηγίες:</strong> Όσο έχεις αυτή τη σελίδα ανοιχτή στο browser σου, το Bot θα σου απαντάει στο Telegram. Δοκίμασε να του στείλεις κάτι τώρα!
      </div>
    </div>
  );
}
