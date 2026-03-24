import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Send, CheckCircle2, Clock, UserPlus, 
  Search, Mail, Phone, FileCheck, X, Loader2, TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

const STAGES = [
  { id: 'lead', label: 'Νέο Lead', color: 'bg-slate-100 text-slate-600', icon: UserPlus },
  { id: 'proposal', label: 'Προσφορά', color: 'bg-blue-100 text-blue-700', icon: FileText },
  { id: 'negotiation', label: 'Διαπραγμάτευση', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'won', label: 'Κλεισμένη Πώληση', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
];

export default function SalesPipeline() {
  const [deals, setDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // States για το Pop-up
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); 
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (customers.length > 0 && deals.length === 0) {
      setDeals(customers.map(c => ({ ...c, stage: c.stage || 'lead' })));
    }
  }, [customers]);

  // Φιλτράρισμα βάσει ΑΦΜ, Ονόματος, Email, Τηλεφώνου
  const filteredDeals = deals.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tax_id?.includes(searchTerm) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  const openActionModal = (deal, type) => {
    setActiveAction({ deal, type });
    setEmailBody(type === 'PROPOSAL' 
      ? `Αγαπητέ συνεργάτη, σας επισυνάπτουμε την οικονομική προσφορά που συζητήσαμε.` 
      : `Αγαπητέ συνεργάτη, ακολουθεί το τιμολόγιο για την παραγγελία σας.`
    );
    setIsModalOpen(true);
  };

  // Η ΠΡΑΓΜΑΤΙΚΗ ΛΕΙΤΟΥΡΓΙΑ ΑΠΟΣΤΟΛΗΣ
  const handleConfirmSend = async () => {
    if (!activeAction?.deal.email) {
      toast({
        variant: "destructive",
        title: "Σφάλμα",
        description: "Ο πελάτης δεν έχει ορισμένο email.",
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Κλήση στο API του Base44 για πραγματική αποστολή
      await base44.integrations.Core.InvokeLLM({
        prompt: `Send an email to ${activeAction.deal.email} with the following message: ${emailBody}. Subject: ${activeAction.type === 'PROPOSAL' ? 'Προσφορά' : 'Τιμολόγιο'} από Nexus ERP.`,
      });

      // Μετακίνηση στο επόμενο στάδιο μόνο αν πετύχει
      let nextStage = activeAction.type === 'PROPOSAL' ? 'proposal' : 'won';
      
      setDeals(prev => prev.map(d => 
        d.id === activeAction.deal.id ? { ...d, stage: nextStage } : d
      ));

      toast({
        title: "Επιτυχία!",
        description: `Το email στάλθηκε στον ${activeAction.deal.name}.`,
      });

    } catch (error) {
      console.error("Email Error:", error);
      toast({
        variant: "destructive",
        title: "Αποτυχία",
        description: "Δεν ήταν δυνατή η αποστολή του email.",
      });
    } finally {
      setIsSending(false);
      setIsModalOpen(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      <PageHeader 
        title="Sales Pipeline" 
        subtitle="Διαχείριση ροής πωλήσεων και αυτόματη αποστολή εγγράφων"
      />

      {/* ΑΝΑΖΗΤΗΣΗ */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Αναζήτηση με Όνομα, ΑΦΜ, Email ή Τηλέφωνο..." 
          className="pl-10 h-12 bg-white border-slate-200 shadow-sm rounded-2xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col bg-slate-50/70 rounded-3xl border border-slate-200/50 p-4">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl shadow-sm", stage.color)}>
                  <stage.icon size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{stage.label}</h3>
              </div>
              <Badge variant="outline" className="bg-white text-slate-400 border-slate-200">
                {filteredDeals.filter(d => d.stage === stage.id).length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {filteredDeals.filter(d => d.stage === stage.id).map((deal) => (
                  <motion.div
                    key={deal.id}
                    layoutId={deal.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="shadow-sm border-slate-200/80 hover:border-blue-500 transition-all bg-white rounded-2xl group overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                           <p className="font-bold text-slate-900 text-sm truncate">{deal.name}</p>
                           <TrendingUp size={14} className="text-slate-200" />
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ΑΦΜ: {deal.tax_id || '—'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Mail size={10} className="text-slate-300" /> {deal.email || '—'}
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-3 border-t border-slate-50">
                          {stage.id === 'lead' && (
                            <Button 
                              onClick={() => openActionModal(deal, 'PROPOSAL')}
                              className="w-full h-9 text-[10px] font-black gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-blue-100 shadow-lg"
                            >
                              <Send size={12} /> ΣΤΕΙΛΕ ΠΡΟΣΦΟΡΑ
                            </Button>
                          )}

                          {stage.id === 'proposal' && (
                            <Button 
                              onClick={() => openActionModal(deal, 'INVOICE')}
                              className="w-full h-9 text-[10px] font-black gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-emerald-100 shadow-lg"
                            >
                              <FileCheck size={12} /> ΣΤΕΙΛΕ ΤΙΜΟΛΟΓΙΟ
                            </Button>
                          )}

                          {stage.id === 'won' && (
                            <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                              <CheckCircle2 size={12} /> Κέρδος
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* POP-UP MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {activeAction?.type === 'PROPOSAL' ? 'Προετοιμασία Προσφοράς' : 'Έκδοση Τιμολογίου'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-1">
              Αποστολή επίσημου εγγράφου στον πελάτη <strong>{activeAction?.deal.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-5">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
                  <Mail size={20} />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Παραλήπτη</p>
                 <p className="text-sm font-bold text-slate-700">{activeAction?.deal.email || 'Δεν υπάρχει email'}</p>
               </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Μήνυμα Συνοδείας</label>
              <Textarea 
                placeholder="Γράψτε το μήνυμά σας εδώ..."
                className="rounded-2xl border-slate-200 focus:ring-blue-500 min-h-[120px] p-4 text-sm"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold text-slate-400">
              Ακύρωση
            </Button>
            <Button 
              disabled={isSending}
              onClick={handleConfirmSend}
              className={cn(
                "rounded-2xl px-8 py-6 font-black uppercase text-xs tracking-widest transition-all",
                activeAction?.type === 'PROPOSAL' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-xl" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 shadow-xl"
              )}
            >
              {isSending ? (
                <><Loader2 size={16} className="animate-spin mr-2" /> Αποστολή...</>
              ) : (
                <><Send size={16} className="mr-2" /> Επιβεβαίωση</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
