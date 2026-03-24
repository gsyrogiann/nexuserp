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
import { toast } from 'sonner';

const STAGES = [
  { id: 'lead', label: 'Νέο Lead', color: 'bg-slate-100 text-slate-600', icon: UserPlus },
  { id: 'proposal', label: 'Προσφορά', color: 'bg-blue-100 text-blue-700', icon: FileText },
  { id: 'negotiation', label: 'Διαπραγμάτευση', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'won', label: 'Κλεισμένη Πώληση', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
];

export default function SalesPipeline() {
  const [deals, setDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); 
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (customers.length > 0 && deals.length === 0) {
      setDeals(customers.map(c => ({ ...c, stage: c.stage || 'lead' })));
    }
  }, [customers]);

  const filteredDeals = deals.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tax_id?.includes(searchTerm) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  const openActionModal = (deal, type) => {
    setActiveAction({ deal, type });
    setEmailBody(type === 'PROPOSAL' 
      ? `Αγαπητέ συνεργάτη, σας επισυνάπτουμε την προσφορά για το Nexus ERP.` 
      : `Αγαπητέ συνεργάτη, ακολουθεί το τιμολόγιο για την παραγγελία σας.`
    );
    setIsModalOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!activeAction?.deal.email) {
      toast.error("Ο πελάτης δεν έχει email!");
      return;
    }

    setIsSending(true);
    try {
      // Χρησιμοποιούμε το InvokeLLM (που είναι ήδη στημένο στο entry.ts σου) 
      // για να "διατάξουμε" το σύστημα να στείλει το email μέσω του Gmail Integration
      await base44.integrations.Core.InvokeLLM({
        prompt: `ACTION: SEND_EMAIL
        TO: ${activeAction.deal.email}
        SUBJECT: ${activeAction.type === 'PROPOSAL' ? 'Προσφορά' : 'Τιμολόγιο'}
        BODY: ${emailBody}
        ΠΡΟΣΟΧΗ: Χρησιμοποίησε το συνδεδεμένο Gmail account για την αποστολή.`
      });

      // Μετακίνηση σταδίου
      let nextStage = activeAction.type === 'PROPOSAL' ? 'proposal' : 'won';
      setDeals(prev => prev.map(d => 
        d.id === activeAction.deal.id ? { ...d, stage: nextStage } : d
      ));

      toast.success("Το αίτημα αποστολής στάλθηκε στο AI!");
    } catch (error) {
      console.error(error);
      toast.error("Αποτυχία επικοινωνίας με το API.");
    } finally {
      setIsSending(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      <PageHeader title="Sales Pipeline" subtitle="Αυτοματοποιημένη ροή και αποστολή εγγράφων" />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Αναζήτηση (ΑΦΜ, Όνομα, Email...)" 
          className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col bg-slate-50/60 rounded-3xl border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl shadow-sm", stage.color)}>
                  <stage.icon size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{stage.label}</h3>
              </div>
              <Badge variant="outline" className="bg-white text-slate-400">{filteredDeals.filter(d => d.stage === stage.id).length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {filteredDeals.filter(d => d.stage === stage.id).map((deal) => (
                  <motion.div key={deal.id} layoutId={deal.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <Card className="shadow-sm border-slate-200/80 hover:border-blue-500 transition-all bg-white rounded-2xl group">
                      <CardContent className="p-5">
                        <p className="font-bold text-slate-900 text-sm truncate">{deal.name}</p>
                        <div className="space-y-1 mb-4 mt-2">
                          <p className="text-[10px] text-slate-400 font-mono">ΑΦΜ: {deal.tax_id || '—'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Mail size={10} /> {deal.email || '—'}</div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                          {stage.id === 'lead' && (
                            <Button onClick={() => openActionModal(deal, 'PROPOSAL')} className="w-full h-8 text-[10px] font-bold gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl">
                              <Send size={12} /> ΣΤΕΙΛΕ ΠΡΟΣΦΟΡΑ
                            </Button>
                          )}
                          {stage.id === 'proposal' && (
                            <Button onClick={() => openActionModal(deal, 'INVOICE')} className="w-full h-8 text-[10px] font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                              <FileCheck size={12} /> ΣΤΕΙΛΕ ΤΙΜΟΛΟΓΙΟ
                            </Button>
                          )}
                          {stage.id === 'won' && (
                            <div className="flex items-center justify-center gap-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase">
                              <CheckCircle2 size={12} /> Won
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{activeAction?.type === 'PROPOSAL' ? 'Προσφορά' : 'Τιμολόγιο'}</DialogTitle>
            <DialogDescription>Αποστολή στον {activeAction?.deal.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border text-xs space-y-1">
               <p className="font-bold text-slate-400 uppercase">Προς:</p>
               <p className="font-bold text-slate-700">{activeAction?.deal.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Μήνυμα</label>
              <Textarea 
                className="rounded-xl border-slate-200 resize-none"
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Άκυρο</Button>
            <Button 
              disabled={isSending} 
              onClick={handleConfirmSend} 
              className={cn("rounded-xl gap-2 min-w-[120px]", activeAction?.type === 'PROPOSAL' ? "bg-blue-600" : "bg-emerald-600")}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Αποστολή...' : 'Επιβεβαίωση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
